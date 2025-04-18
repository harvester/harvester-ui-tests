import NetworkPage from '@/pageobjects/network.po';
import { VmsPage } from "@/pageobjects/virtualmachine.po";
import { generateName } from '@/utils/utils';

// const network = new NetworkPage()
const vms = new VmsPage();

describe.skip('Virtual Machine - Add Network', () => {
  const VM_NAME = generateName('test-network');
  const NETWORK_1 = 'vlan1'
  const NETWORK_2 = 'vlan2'
  const NAMESPACE = 'default'

  beforeEach(() => {
    cy.login();
  });

  // TODO: finish this test case
  it('Should add another network to an existing VM', () => {
    const imageEnv = Cypress.env('image');

    const value = {
      name: VM_NAME,
      cpu: '2',
      memory: '4',
      image: Cypress._.toLower(imageEnv.name),
      networks: [{
        network: NETWORK_1,
      }],
      namespace: NAMESPACE,
    }
    vms.create(value);
    vms.goToConfigDetail(VM_NAME);
    cy.url().should('contain', VM_NAME)

    const editValue = {
      networks: [{
        network: NETWORK_1,
      }, {
        network: NETWORK_2,
      }]
    }
    vms.edit(VM_NAME, editValue);

    vms.delete(NAMESPACE, VM_NAME)
  })
})