import { VmsPage } from "@/pageobjects/virtualmachine.po";
import { VolumePage } from "@/pageobjects/volume.po";
import NamespacePage from "@/pageobjects/namespace.po";
import { PageUrl } from "@/constants/constants";
import { ImagePage } from "@/pageobjects/image.po";
import { generateName } from '@/utils/utils';
import { Constants } from "@/constants/constants";
import { host as hostUtil } from '@/utils/utils';

const vms = new VmsPage();
const volumePO = new VolumePage();
const constants = new Constants();
const namespaces = new NamespacePage();
const imagePO = new ImagePage();

/**
 * @module testcases/virtualmachines/vm-migration.spec.ts
 * @description This module contains test cases for virtual machine migration and related functionalities.
 */
describe('VM Live Migration', () => {
  beforeEach(() => {
    cy.login({ url: PageUrl.virtualMachine });
  });

  /**
   * 1. Navigate to the VM create page
   * 2. Create a new VM with cloud init config data
   * 3. ssh to the vm and create a new file
   * 4. Get the original node name before migration
   * 5. Migrate the VM to another host
   *  - VM should go into migrating status
   * 6. Check can correctly migrate to other node
   * 7. VM migrated should be in running state
   * 8. ssh to the vm, check the file content is the same
  */
  it('Migrate VM with cloud init data', () => {
    const VM_NAME = generateName('test-vm-migrate');
    const NAMESPACE = 'default'
    const NETWORK = 'vlan1'
    const largeImageEnv = Cypress.env('largeImage');
    const USERDATA = `#cloud-config
password: password
chpasswd: { expire: False }
sshpwauth: True
`

    const value = {
      name: VM_NAME,
      cpu: '1',
      memory: '2',
      image: largeImageEnv.name,
      networks: [{
        network: NETWORK,
      }],
      guestAgent: true,
      namespace: NAMESPACE,
      userData: USERDATA,
    }
    vms.create(value);

    // Check VM is running
    vms.censorInColumn(VM_NAME, 3, NAMESPACE, 4, 'Running', 2, { timeout: constants.timeout.maxTimeout, nameSelector: '.name-console a' });
    // Wait for IP address show in table
    vms.censorInColumn(VM_NAME, 3, NAMESPACE, 4, '.', 7, { timeout: constants.timeout.maxTimeout, nameSelector: '.name-console a' });

    // Check VM display IP address and ssh to the VM
    cy.contains('tr', VM_NAME)
      .wait(10000) // Wait for system ssh port ready
      .find('[data-title="IP Address"] > div > span > .copy-to-clipboard-text')
      .then($els => {
        const address = $els[0]?.innerText

        vms.sshWithCommand(
          VM_NAME,
          'opensuse',
          'password',
          'echo "content before migration" > migrate-vm.txt',
          false  // Don't check the output
        );

      })

    // Get the original node name before migration
    cy.contains('tr', VM_NAME)
      .find('td')
      .eq(7) // Node column
      .invoke('text')
      .then((nodeName) => {
        const originalNode = nodeName.trim();
        cy.log(`VM is currently running on node: ${originalNode}`);

        // Find the first node that doesn't match the original node
        const targetNode = hostUtil.list().find(host => {
          const hostName = host.name || host.customName;
          return hostName !== originalNode;
        })?.name || hostUtil.list().find(host => {
          const hostName = host.name || host.customName;
          return hostName !== originalNode;
        })?.customName;

        cy.log(`Target node for migration: ${targetNode}`);

        // Store both nodes for later comparison
        cy.wrap(originalNode).as('originalNode');
        cy.wrap(targetNode).as('targetNode');

        // Perform migration with the found target node
        vms.clickMigrateAction(VM_NAME, `${targetNode}`);

        // Check VM in migrating state
        vms.censorInColumn(VM_NAME, 3, NAMESPACE, 4, 'Migrating', 2, {
          timeout: constants.timeout.maxTimeout,
          nameSelector: '.name-console a'
        });

        // Check VM in running state
        vms.censorInColumn(VM_NAME, 3, NAMESPACE, 4, 'Running', 2, {
          timeout: constants.timeout.maxTimeout,
          nameSelector: '.name-console a'
        });

        // Verify migration was successful
        cy.contains('tr', VM_NAME)
          .find('td')
          .eq(7)
          .invoke('text')
          .then((newNodeName) => {
            const currentNode = newNodeName.trim();
            expect(currentNode).to.equal(targetNode);
            expect(currentNode).to.not.equal(originalNode);
            cy.log(`Migration successful: ${originalNode} → ${currentNode}`);

          });
      });

    // Check the file content not changed after migration  
    vms.sshWithCommand(
      VM_NAME,
      'opensuse',
      'password',
      'cat migrate-vm.txt',
      true,  // Don't check the output
      'content before migration'
    );
    // tear down
    vms.delete(NAMESPACE, VM_NAME)

  });

})
