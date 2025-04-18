import cloudConfigTemplatePage from "@/pageobjects/cloudConfigTemplate.po";
import {generateName} from '@/utils/utils';

const cloudConfig = new cloudConfigTemplatePage();

describe("Cloud Configuration Templates Page", () => {
  beforeEach(() => {
    cy.login();
  });

  /**
   * 1. Login
   * 2. Navigate to the cloud template create page
   * 3. Input User Data
   * 4. click Create button
   * Expected Results
   * 1. Create cloud config template with user data success
  */
  it("Create cloud config template", () => {
    const namespace = 'default'
    const name = generateName('test-cloud-config-template-create')

    cy.intercept('POST', `/v1/harvester/configmaps`).as('create');

    cloudConfig.create({
      name,
      namespace,
      data: 'test-data'
    })

    cy.wait('@create').then(res => {
      expect(res.response?.statusCode).to.equal(201);
      const type = res.response?.body?.metadata?.labels['harvesterhci.io/cloud-init-template']
      const data = res.response?.body?.data

      expect(type, 'Check selected template type').to.equal('user');
      expect(data?.cloudInit, 'Check user data').to.equal('test-data');
    })

    cloudConfig.delete(namespace, name)
  });

  /**
   * 1. Login
   * 2. Navigate to the cloud template create page
   * 3. Select Network Data
   * 4. Input Network Data
   * 5. click Create button
   * 6. Edit previous cloud config template
   * 7. Clone previous cloud config template
   * Expected Results
   * 1. Create cloud config template with network data success
   * 2. Edit previous cloud config template success
   * 3. Clone previous cloud config template
  */
  it("Check create network data && edit && clone", () => {
    cy.login();

    const namespace = 'default'
    const name = generateName('test-template-type')

    cy.intercept('POST', `/v1/harvester/configmaps`).as('create');

    cloudConfig.create({
      name,
      namespace,
      templateType: 'Network Data',
      data: 'test-network-data',
    })

    cy.wait('@create').then(res => {
      expect(res.response?.statusCode).to.equal(201);
      const type = res.response?.body?.metadata?.labels['harvesterhci.io/cloud-init-template']
      const data = res.response?.body?.data

      expect(type, 'Check template type').to.equal('network');
      expect(data?.cloudInit, 'Check network data').to.equal('test-network-data');

      cy.intercept('PUT', `/v1/harvester/configmaps/${namespace}/${name}`).as('update');

      const editedData = 'test-edit-data'
    
      cloudConfig.checkEdit(name, namespace, {
        data: editedData,
      })
    
      cy.wait('@update').then(res => {
        expect(res.response?.statusCode, `Check update ${namespace}/${name}`).to.equal(200);
        const data = res.response?.body?.data
    
        expect(data?.cloudInit, 'Check edited data').to.equal(editedData);

        cy.intercept('POST', `/v1/harvester/configmaps`).as('create');

        const cloneName = generateName('test-clone-clone')
      
        const value = {
          name: cloneName,
        }
      
        cloudConfig.checkClone(name, namespace, value)
      
        cy.wait('@create').then(res => {
          expect(res.response?.statusCode).to.equal(201);
          const type = res.response?.body?.metadata?.labels['harvesterhci.io/cloud-init-template']
          const data = res.response?.body?.data
      
          expect(type, 'Check template data').to.equal('network');
          expect(data?.cloudInit, 'Check clouded network data').to.equal(editedData);
      
          cloudConfig.deleteFromStore(`${namespace}/${name}`)
          cloudConfig.deleteFromStore(`${namespace}/${cloneName}`)
        })
      })
    })
  });
});
