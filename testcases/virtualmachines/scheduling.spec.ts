import { VmsPage } from "@/pageobjects/virtualmachine.po";
import { HostsPage } from "@/pageobjects/hosts.po";
import { host as hostsUtil } from '@/utils/utils';
import { Node } from '@/models/host'

const vms = new VmsPage();
const hosts = new HostsPage();

/**
 * https://harvester.github.io/tests/manual/virtual-machines/vm_schedule_on_node/
 */
describe('VM scheduling on Specific node', () => { 
  beforeEach(() => {
    cy.login();
  });

  it('Schedule VM on the Node which is Enable Maintenance Mode', () => {
    const hostList = hostsUtil.list();

    const hostNames: string[] = hostList.map((node: Node) => node.name || node.customName);

    const maintenanceNodeName = hostNames[0]
    const filterMaintenanceNodeNames = hostNames.filter(name => name !== maintenanceNodeName);

    // Check whether all nodes can be selected
    vms.goToCreate();
    vms.selectSchedulingType({type: 'specific'});
    vms.checkSpecificNodes({includeNodes: hostNames});
    
    hosts.goToList();
    hosts.enableMaintenance(maintenanceNodeName);
    hosts.checkNodeState('Maintenance');

    // Maintenance nodes should not be selected
    vms.goToCreate();
    vms.selectSchedulingType({type: 'specific'});
    vms.checkSpecificNodes({includeNodes: filterMaintenanceNodeNames, excludeNodes: [maintenanceNodeName]});

    hosts.goToList();
    hosts.clickAction(maintenanceNodeName, 'Disable Maintenance Mode');
    hosts.checkNodeState('Active');

    // Check whether all nodes can be selected
    vms.goToCreate();
    vms.selectSchedulingType({type: 'specific'});
    vms.checkSpecificNodes({includeNodes: hostNames});
  })
})

