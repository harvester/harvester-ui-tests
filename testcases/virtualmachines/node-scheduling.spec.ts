import { VmsPage } from "@/pageobjects/virtualmachine.po";
import { generateName, host as hostUtil } from '@/utils/utils';
import { Constants } from "@/constants/constants";

const vmPO = new VmsPage();
const constants = new Constants();

describe('Virtual Machine - Node Scheduling', () => {
  it('Should create a VM with node scheduling', () => {
    cy.login();

    const VM_NAME = generateName('test-vm-scheduling');
    const namespace = 'default'
    const firstNode = hostUtil.list()[0];
    const nodeName = firstNode?.name || firstNode?.customName
    const imageEnv = Cypress.env('image');

    const volume = [{
      buttonText: 'Add Volume',
      create: false,
      image: `default/${Cypress._.toLower(imageEnv.name)}`,
      size: 4
    }];

    // Create VM
    vmPO.goToCreate();
    vmPO.setNameNsDescription(VM_NAME, namespace);
    vmPO.setBasics('1', '1');
    vmPO.setVolumes(volume);
    vmPO.setNodeScheduling({
      radio: 'specific',
      nodeName
    });
    vmPO.save();

    // Validate VM is Running
    vmPO.censorInColumn(VM_NAME, 3, namespace, 4, 'Running', 2, {
      nameSelector: '.name-console a',
      timeout: constants.timeout.uploadTimeout,
    });

    // Stop VM and validate status
    vmPO.clickAction(VM_NAME, 'Stop');
    vmPO.censorInColumn(VM_NAME, 3, namespace, 4, 'Stopping', 2, {
        nameSelector: '.name-console a',
        timeout: constants.timeout.uploadTimeout,
    });

    // Clean up
    vmPO.deleteVMFromStore(`${namespace}/${VM_NAME}`);
  })
})
