import YAML from 'js-yaml'
import { VmsPage } from "@/pageobjects/virtualmachine.po";
import { generateName, base64Decode } from '@/utils/utils';

const vms = new VmsPage();

describe('Virtual Machine - Advanced', () => { 
  beforeEach(() => {
    cy.login();
  });

  it("Create a new VM with 'Enable USB tablet' checked", () => {
    const VM_NAME = generateName('test-usb-tablet')
    const NAMESPACE = 'default'

    vms.goToCreate();
    
    const imageEnv = Cypress.env('image');

    const value = {
      name: VM_NAME,
      cpu: '2',
      memory: '4',
      image: Cypress._.toLower(imageEnv.name),
      usbTablet: true,
      namespace: NAMESPACE,
    }
    vms.setValue(value);

    vms.save();

    vms.goToConfigDetail(VM_NAME);

    cy.get('.tab#advanced').click()
    vms.usbTablet().expectChecked()

    cy.intercept('GET', `/apis/kubevirt.io/v1/namespaces/*/virtualmachines/${VM_NAME}`).as('vmDetail');

    vms.goToYamlEdit(VM_NAME);
    
    cy.wait('@vmDetail').then(res => {
      expect(res.response?.statusCode).to.equal(200);
      const yaml = res.response?.body

      const yamlValue:any = YAML.load(yaml)
      const inputs = yamlValue?.spec?.template?.spec?.domain?.devices?.inputs || []
      const foundTablet = !!inputs.find((i:any) => i.name === 'tablet')

      expect(foundTablet).to.equal(true);
    })

    vms.deleteFromStore(`${NAMESPACE}/${VM_NAME}`)
  })

  it("Create a new VM with 'Install guest agent' checked", () => {
    const VM_NAME = generateName('test-guest-agent')
    const NAMESPACE = 'default'

    vms.goToCreate();

    const imageEnv = Cypress.env('image');

    const value = {
      name: VM_NAME,
      cpu: '2',
      memory: '4',
      image: Cypress._.toLower(imageEnv.name),
      guestAgent: true,
      namespace: NAMESPACE,
    }
    vms.setValue(value);

    vms.save();

    vms.goToConfigDetail(VM_NAME);

    cy.get('.tab#advanced').click()
    vms.usbTablet().expectChecked()

    vms.deleteFromStore(`${NAMESPACE}/${VM_NAME}`)
  })

  it("Create a new VM with 'Booting in EFI mode' checked", () => {
    const VM_NAME = generateName('test-efi')
    const NAMESPACE = 'default'

    const imageEnv = Cypress.env('image');

    const value = {
      name: VM_NAME,
      cpu: '2',
      memory: '4',
      image: Cypress._.toLower(imageEnv.name),
      efiEnabled: true,
      namespace: NAMESPACE,
    }

    cy.intercept('POST', '/v1/harvester/kubevirt.io.virtualmachines/*').as('createVM');

    vms.create(value);

    cy.wait('@createVM').then(res => {
      expect(res.response?.statusCode, 'Check create VM').to.equal(201);
      expect(res.response?.body?.spec?.template?.spec?.domain?.firmware?.bootloader?.efi?.secureBoot, 'Check efi.secureBoot').to.equal(false);
    })

    vms.goToConfigDetail(VM_NAME);

    cy.get('.tab#advanced').click()
    vms.efiEnabled().expectChecked()

    vms.deleteFromStore(`${NAMESPACE}/${VM_NAME}`)
  })


  /**
   * 1. Create images using the external path for cloud image.
   * 2. In user data mention the below to access the vm.
   * 3.
   * ```
   * #cloud-config
   * password: password
   * chpasswd: {expire: False}
   * sshpwauth: True
   * ```
   * 4. Create the 3 vms and wait for vm to start.
   * Expected Results
   * 1. 3 vm should come up and start with same config.
   */
  it('Create 3 VM instances with same user data', () => {
    vms.goToCreate();

    const namePrefix = 'test-multiple-instances'
    const namespace = 'default'
    const vmCount = 3
    const imageEnv = Cypress.env('image');
    const userData = `#cloud-config
password: password
chpasswd: { expire: False }
sshpwauth: True
`

    vms.setMultipleInstance({
      namePrefix,
      count: `${vmCount}`,
    })

    cy.intercept('POST', '/v1/harvester/kubevirt.io.virtualmachines/*').as('createVM');
    cy.intercept('POST', '/v1/harvester/secrets/*').as('createSecret');

    const volume = [{
      buttonText: 'Add Volume',
      create: false,
      image: `default/${Cypress._.toLower(imageEnv.name)}`,
    }];

    vms.setNameNsDescription(namePrefix, namespace);
    vms.setBasics('1', '1');
    vms.setVolumes(volume);
    vms.setAdvancedOption({
      userData, 
    })

    vms.save()

    for( let i=0; i<vmCount; i++) {
      cy.wait('@createVM').then(res => {
        expect(res.response?.statusCode, 'Check create VM').to.equal(201);
        
        expect(res.response?.body?.spec?.template?.spec?.domain?.resources?.limits?.cpu).to.equal('1')
        expect(res.response?.body?.spec?.template?.spec?.domain?.resources?.limits?.memory).to.equal('1Gi')
      })
      cy.wait('@createSecret').then(res => {
        expect(res.response?.statusCode, 'Check create secret').to.equal(201);

        const userDataYAML = base64Decode(res.response?.body?.data?.userdata)
        expect(userDataYAML, 'Check user data').to.equal(userData)
      })
    }

    const vmNames = Cypress._.range(0, vmCount).map(i => `${namePrefix}-0${i+1}`);

    // Validate all VMs are Running and delete them
    vmNames.forEach(vmName=>{
      vms.checkVMState(vmName, 'Running');
      vms.deleteVMFromStore(`${namespace}/${vmName}`);
    })
  })

  /**
   * 1. Add User data to the VM
   * 2. Save/Create the VM
   * Expected Results
   * 1. User data should in YAML
   */
  it('Create a VM with user data added', () => {
    const VM_NAME = generateName('test-user-data')
    const namespace = 'default'

    const imageEnv = Cypress.env('image');
    const userData = `#cloud-config
password: password
chpasswd: { expire: False }
sshpwauth: True
`

    vms.goToCreate()

    const volume = [{
      buttonText: 'Add Volume',
      create: false,
      image: `default/${Cypress._.toLower(imageEnv.name)}`,
    }];

    vms.setNameNsDescription(VM_NAME, namespace);
    vms.setBasics('1', '1');
    vms.setVolumes(volume);
    vms.setAdvancedOption({
      userData, 
    })

    cy.intercept('POST', '/v1/harvester/kubevirt.io.virtualmachines/*').as('createVM');
    cy.intercept('POST', '/v1/harvester/secrets/*').as('createSecret');

    vms.save();

    cy.wait('@createVM').then(res => {
      expect(res.response?.statusCode, 'Check create VM').to.equal(201);
    })

    cy.wait('@createSecret').then(res => {
      expect(res.response?.statusCode, 'Check create secret').to.equal(201);

      const userDataYAML = base64Decode(res.response?.body?.data?.userdata)
      expect(userDataYAML, 'Check user data').to.equal(userData)
    })

    vms.deleteFromStore(`${namespace}/${VM_NAME}`)
  })

  /**
   * 1. Add Network Data to the VM
   * 2. Save/Create the VM
   * Expected Results
   * 1. Network Data should show in YAML
   */
  it('Create new VM with Network Data added', () => {
    const VM_NAME = generateName('test-network-data')
    const namespace = 'default'

    const imageEnv = Cypress.env('image');
    const networkData = `
network:
version: 1
config:
- type: physical
  name: eth0
  subnets:
  - type: dhcp
`

    cy.intercept('POST', '/v1/harvester/kubevirt.io.virtualmachines/*').as('createVM');
    cy.intercept('POST', '/v1/harvester/secrets/*').as('createSecret');

    vms.goToCreate()

    const volume = [{
      buttonText: 'Add Volume',
      create: false,
      image: `default/${Cypress._.toLower(imageEnv.name)}`,
    }];

    vms.setNameNsDescription(VM_NAME, namespace);
    vms.setBasics('1', '1');
    vms.setVolumes(volume);
    vms.setAdvancedOption({
      networkData, 
    })

    vms.save();

    cy.wait('@createVM').then(res => {
      expect(res.response?.statusCode, 'Check create VM').to.equal(201);
    })

    cy.wait('@createSecret').then(res => {
      expect(res.response?.statusCode, 'Check create secret').to.equal(201);

      const networkDataYAML = base64Decode(res.response?.body?.data?.networkdata)
      expect(networkDataYAML, 'Check network data').to.equal(networkDataYAML)
    })

    vms.deleteFromStore(`${namespace}/${VM_NAME}`)
  })  
})
