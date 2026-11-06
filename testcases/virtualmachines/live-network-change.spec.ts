import { VmsPage } from "@/pageobjects/virtualmachine.po";
import { generateName, getServerVersion, isVersionAtLeast } from '@/utils/utils';

const vms = new VmsPage();

const NAMESPACE = 'default';
const VM_NAME = generateName('test-live-nad');
// The UI skips the restart prompt for network-only changes from Harvester v1.10.0 (KubeVirt LiveUpdateNADRef)
const MIN_VERSION = 'v1.10.0';
const BANNER_TEXT = 'The virtual machine is live-migrated to apply the network change without a restart. The MAC address is kept; the guest may need to renew its DHCP lease if the new network uses a different subnet.';

// Optional overrides, `<namespace>/<name>` of the VM networks:
// "liveNetworkChange": { "bridgeNetworks": ["default/vlan1", "default/vlan2"], "overlayNetwork": "default/overlay" }
const liveNetworkChangeEnv = Cypress.env('liveNetworkChange') || {};
const envVlans: number[] = (Cypress.env('networks') || {}).vlans || [];

let skipReason = '';
let bridgeNetworks: string[] = [];
let overlayNetwork = '';
let vmCreated = false;

/**
 * Pick two bridge VM networks and an overlay VM network in the VM namespace, preferring the env overrides,
 * then the `vlan<id>` networks of `networks.vlans`
 */
function resolveNetworks(nads: any[]) {
  const typeOf = (nad: any) => {
    try {
      return JSON.parse(nad?.spec?.config || '{}').type;
    } catch (e) {
      return undefined;
    }
  };
  const idsOfType = (type: string) => nads.filter((N) => N.metadata?.namespace === NAMESPACE && typeOf(N) === type).map((N) => `${N.metadata.namespace}/${N.metadata.name}`).sort();
  const preferred = envVlans.map((v) => `${NAMESPACE}/vlan${v}`);
  const bridges = idsOfType('bridge').sort((a, b) => Number(!preferred.includes(a)) - Number(!preferred.includes(b)));

  bridgeNetworks = liveNetworkChangeEnv.bridgeNetworks || bridges.slice(0, 2);
  overlayNetwork = liveNetworkChangeEnv.overlayNetwork || idsOfType('kube-ovn')[0] || '';
}

/**
 * The other bridge network than the one the NIC uses
 */
function otherBridgeNetwork(current: string) {
  return bridgeNetworks.find((N) => N !== current) as string;
}

before(() => {
  cy.login();

  getServerVersion().then((version) => {
    if (!isVersionAtLeast(version, MIN_VERSION)) {
      skipReason = `Harvester ${version} is older than ${MIN_VERSION}`;
    }
  });

  cy.request({ url: '/v1/harvester/nodes', headers: { accept: 'application/json' } }).then((res) => {
    const nodes: any[] = res.body?.data || [];

    if (!skipReason && nodes.length < 2) {
      skipReason = 'Live migration needs at least 2 nodes';
    }
  });

  cy.request({ url: '/v1/harvester/k8s.cni.cncf.io.network-attachment-definitions', headers: { accept: 'application/json' } }).then((res) => {
    resolveNetworks(res.body?.data || []);

    if (!skipReason && bridgeNetworks.length < 2) {
      skipReason = `Needs 2 bridge VM networks in namespace ${NAMESPACE}`;
    }
  });
});

beforeEach(function () {
  if (skipReason) {
    cy.log(`Skip: ${skipReason}`);
    this.skip();
  }
});

/**
 * @module testcases/virtualmachines/live-network-change.spec.ts
 * @description Change the network of a running VM without a restart (harvester/harvester#11769)
 */
describe('Change the network of a running VM via live migration', () => {
  before(() => {
    if (skipReason) {
      return;
    }

    cy.login();
    // Make sure the image exists
    vms.init();

    const imageEnv = Cypress.env('image');

    vms.create({
      name: VM_NAME,
      namespace: NAMESPACE,
      cpu: '1',
      memory: '1',
      image: Cypress._.toLower(imageEnv.name),
      diskSize: '4',
      networks: [{ network: bridgeNetworks[0] }],
    });
    cy.then(() => {
      vmCreated = true;
    });

    vms.waitForLiveMigratable(VM_NAME, NAMESPACE);
  });

  beforeEach(() => {
    // The session is cleared between tests
    cy.login();
  });

  after(() => {
    if (vmCreated) {
      cy.login();
      vms.deleteVMByApi(VM_NAME, NAMESPACE);
    }
  });

  /**
   * 1. Edit Config of a running, live-migratable VM with a NIC on a bridge VM network
   * 2. On the Networks tab, change the NIC to another bridge VM network
   * 3. Verify the live network change banner is shown
   * 4. Save
   * 5. Verify that no "Restart Virtual Machine" dialog is shown and the page goes back to the VM list
   * 6. Verify the VM is live-migrated to the new network, without a restart and without RestartRequired
   */
  it('should live-migrate the VM to another bridge network without a restart prompt', () => {
    vms.waitForLiveMigratable(VM_NAME, NAMESPACE);

    vms.getNicNetworkName(VM_NAME, NAMESPACE).then((current) => {
      const target = otherBridgeNetwork(current);

      vms.getVmi(VM_NAME, NAMESPACE).then((vmi) => {
        vms.goToEditConfig(VM_NAME, NAMESPACE);
        vms.selectNicNetwork(target);
        vms.liveNetworkChangeBanner().should('be.visible').and('contain', BANNER_TEXT);

        vms.saveEdit({ expectRestartPrompt: false });

        vms.waitForLiveNetworkChange(VM_NAME, target, NAMESPACE, { vmi });
      });
    });
  });

  /**
   * 1. Edit Config of a running, live-migratable VM with a NIC on a bridge VM network
   * 2. Change the NIC to another bridge VM network, verify the banner is shown
   * 3. Change the CPU as well
   * 4. Save
   * 5. Verify the "Restart Virtual Machine" dialog is shown, click "Save and Restart"
   * 6. Verify the VM restarts and runs on the new network
   */
  it('should prompt for a restart when another setting changes together with the network', () => {
    vms.waitForLiveMigratable(VM_NAME, NAMESPACE);

    vms.getNicNetworkName(VM_NAME, NAMESPACE).then((current) => {
      const target = otherBridgeNetwork(current);

      vms.getVmi(VM_NAME, NAMESPACE).then((vmi) => {
        vms.goToEditConfig(VM_NAME, NAMESPACE);
        vms.selectNicNetwork(target);
        vms.liveNetworkChangeBanner().should('be.visible');
        vms.setBasics('2');

        vms.saveEdit({ expectRestartPrompt: true, restart: true });

        vms.waitForLiveMigratable(VM_NAME, NAMESPACE, { previousVmiUid: vmi.metadata.uid });
        vms.getVmi(VM_NAME, NAMESPACE).its('spec.networks').should((networks: any[]) => {
          expect(networks.map((N) => N.multus?.networkName)).to.include(target);
        });
      });
    });
  });

  /**
   * 1. Edit Config of a running, live-migratable VM with a NIC on a bridge VM network
   * 2. Change the NIC to an overlay (kube-ovn) VM network, verify no banner is shown
   * 3. Change the NIC to another bridge VM network, verify the banner is shown
   * 4. Change the NIC back to the overlay VM network, verify the banner is gone
   * 5. Save
   * 6. Verify the "Restart Virtual Machine" dialog is shown, click "Save" (the VM keeps running)
   */
  it('should prompt for a restart when the network changes to an overlay network', function () {
    if (!overlayNetwork) {
      cy.log(`Skip: no overlay VM network in namespace ${NAMESPACE}`);
      this.skip();
    }

    vms.waitForLiveMigratable(VM_NAME, NAMESPACE);

    vms.getNicNetworkName(VM_NAME, NAMESPACE).then((current) => {
      vms.goToEditConfig(VM_NAME, NAMESPACE);

      vms.selectNicNetwork(overlayNetwork);
      vms.liveNetworkChangeBanner().should('not.exist');

      vms.selectNicNetwork(otherBridgeNetwork(current));
      vms.liveNetworkChangeBanner().should('be.visible');

      vms.selectNicNetwork(overlayNetwork);
      vms.liveNetworkChangeBanner().should('not.exist');

      // Don't restart: the VM spec is saved with the overlay network, the VM is deleted after the suite
      vms.saveEdit({ expectRestartPrompt: true, restart: false });
    });
  });
});
