import NetworkPage from '@/pageobjects/network.po';
import { VmsPage } from "@/pageobjects/virtualmachine.po";
import { LoginPage } from "@/pageobjects/login.po";
import { generateName } from '@/utils/utils';
import { PageUrl } from "@/constants/constants";
import { Constants } from "@/constants/constants";

const network = new NetworkPage()
const vms = new VmsPage();
const login = new LoginPage();
const constants = new Constants();

/**
 * 1. Login
 * 2. Navigate to the VM create page
 * 3. Provide cpu: 1, memory:1
 * 4. Select opensuse image and use default size
 * 5. Select vlan1 network
 * 6. Confirm VM is started into running state
 * 7. Check vm can get IP address
 */
describe('Create VM with vlan1 network', () => {
  beforeEach(() => {
    cy.login({ url: PageUrl.virtualMachine });
  });

  it('Create VM with vlan1 network', () => {
    const VM_NAME = generateName('test-vm-vlan1');
    const NAMESPACE = 'default';
    const NETWORK = 'vlan1';
    const largeImageEnv = Cypress.env('largeImage');

    const value = {
      name: VM_NAME,
      cpu: '1',
      memory: '1',
      image: largeImageEnv.name,
      networks: [{
        network: NETWORK,
      }],
      namespace: NAMESPACE,
    };

    // Create the VM
    vms.create(value);

    // Navigate to VM list to ensure we're on the correct page
    vms.goToList();

    // Confirm VM is started into running state
    vms.censorInColumn(VM_NAME, 3, NAMESPACE, 4, 'Running', 2, {
      timeout: constants.timeout.maxTimeout,
      nameSelector: '.name-console a'
    });

    // Check VM can get IP address
    vms.censorInColumn(VM_NAME, 3, NAMESPACE, 4, '.', 7, {
      timeout: constants.timeout.maxTimeout,
      nameSelector: '.name-console a'
    });

    // Cleanup
    vms.delete(NAMESPACE, VM_NAME);
  });
})

describe('Add a vlan network to existing VM', () => {
  const VM_NAME = generateName('test-network');
  const NETWORK_1 = 'management Network'
  const NETWORK_2 = 'vlan1'
  const NAMESPACE = 'default'

  beforeEach(() => {
    cy.login();
  });

  it('Add a vlan network to existing VM', () => {
    const largeImageEnv = Cypress.env('largeImage');

    const value = {
      name: VM_NAME,
      cpu: '1',
      memory: '1',
      image: largeImageEnv.name,
      networks: [{
        network: NETWORK_1,
      }],
      namespace: NAMESPACE,
    }

    // Create the VM
    vms.create(value);

    // Navigate to VM list to ensure we're on the correct page
    vms.goToList();

    // Check VM is running initially
    vms.censorInColumn(VM_NAME, 3, NAMESPACE, 4, 'Running', 2, {
      timeout: constants.timeout.maxTimeout,
      nameSelector: '.name-console a'
    });

    // Edit VM to add second network
    const editValue = {
      networks: [{
        network: NETWORK_1,
      }, {
        network: NETWORK_2,
      }]
    };

    vms.edit(VM_NAME, editValue);

    // Check VM is in running state after restart
    vms.censorInColumn(VM_NAME, 3, NAMESPACE, 4, 'Running', 2, {
      timeout: constants.timeout.maxTimeout,
      nameSelector: '.name-console a'
    });

    // Check VM can get IP address
    vms.censorInColumn(VM_NAME, 3, NAMESPACE, 4, '.', 7, {
      timeout: constants.timeout.maxTimeout,
      nameSelector: '.name-console a'
    });

    // Cleanup
    vms.delete(NAMESPACE, VM_NAME);
  })
})