import { VmsPage } from "@/pageobjects/virtualmachine.po";
import { generateName } from '@/utils/utils';
import templatePage from "@/pageobjects/template.po";
import { Constants } from "@/constants/constants";

const vmPO = new VmsPage();
const templates = new templatePage();
const constants = new Constants();

/**
 * 1. Go to Template, create a VM template with Boot in EFI mode selected.
 * 2. Go to Virtual Machines, click Create, select Multiple instance, type in a random name prefix, and select the VM template we just created.
 * 3. Create a VM with template
 * Expected Results
 * 1. Check VM setting, the booting in EFI mode is checked
*/
describe("template with EFI", () => {
  it('template with EFI', () => {
    cy.login();

    const NAME = generateName('test-efi-template')
    const namespace = 'default'
  
    templates.goToCreate()

    const imageEnv = Cypress.env('image');
    const volume = [{
      buttonText: 'Add Volume',
      create: false,
      image: `default/${Cypress._.toLower(imageEnv.name)}`,
    }];

    templates.setNameNsDescription(NAME, namespace);
    templates.setBasics('1', '1')
    templates.setVolumes(volume)
    templates.setAdvancedOption({
      efiEnabled: true
    })

    templates.save({namespace})

    vmPO.goToCreate()

    vmPO.selectTemplateAndVersion({id: `${namespace}/${NAME}`, version: '1'})

    const namePrefix = generateName('test-multiple-efi')

    vmPO.setMultipleInstance({
      namePrefix,
      count: '2',
    })
    vmPO.setNameNsDescription(namePrefix, namespace);

    cy.intercept('POST', '/v1/harvester/kubevirt.io.virtualmachines/*').as('createVM');
    cy.intercept('POST', '/v1/harvester/secrets/*').as('createSecret');

    vmPO.save();

    for( let i=0; i<2; i++) {
      cy.wait('@createVM').then(res => {
        expect(res.response?.statusCode, 'Check create VM').to.equal(201);
        expect(res.response?.body?.spec?.template?.spec?.domain?.firmware?.bootloader?.efi?.secureBoot, 'Check efi.secureBoot').to.equal(false);
      })
      cy.wait('@createSecret').then(res => {
        expect(res.response?.statusCode, 'Check create VM secret').to.equal(201);
      })
    }

    vmPO.goToList()

    for(let i=0; i<2; i++) {
      const index = i + 1 
      const VMName = `${namePrefix}-0${index}`;

      // Validate VM are Running
      vmPO.censorInColumn(VMName, 3, namespace, 4, 'Running', 2, {
        nameSelector: '.name-console a',
        timeout: constants.timeout.maxTimeout,
      });
      // delete VM
      vmPO.deleteVMFromStore(`${namespace}/${VMName}`);
    }

  })
})
