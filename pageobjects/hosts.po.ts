import { Constants } from "../constants/constants";
const constants = new Constants();
import CruResourcePo from '@/utils/components/cru-resource.po';
import { HCI } from '@/constants/types'
import LabeledInputPo from '@/utils/components/labeled-input.po';
import { Node } from '@/models/host'

interface ValueInterface {
  namespace?: string,
  name?: string,
  description?: string,
  customName?: string,
  consoleUrl?: string,
}

export class HostsPage extends CruResourcePo {
  private hostList = '.host-list';
  private actionsDropdown = '.role-multi-action';
  private editButton = '.icon-edit';
  private editYamlButton = '.icon-file';

  constructor() {
    super({
      type: HCI.HOST,
      realType: 'node',
    });
  }

  public navigateHostsPage() {
    cy.visit(constants.hostsPage);
  }

  public editHosts() {
    this.navigateHostsPage();
    cy.get(this.actionsDropdown).first().click();
    cy.get(this.editButton).click();
  }

  // Function to edit host with given name and console URL
  public editHostBasics(name: string, customName: string, consoleUrl: string){
    this.goToEdit(name);
    this.setValue({ customName, consoleUrl });
    this.update(name);
  };

  // Function to verify host update
  public verifyHostUpdate (name: string) {
    this.search(name);
    cy.get('.console-button [type="button"]').should('not.be.disabled');
    cy.get('tbody').contains(name).should('exist');
  };

  public editHostsYaml() {
    this.navigateHostsPage();
    cy.get(this.actionsDropdown).first().click();
    cy.get(this.editYamlButton).click();
  }

  customName() {
    return new LabeledInputPo('.labeled-input', `:contains("Custom Name")`)
  }

  consoleUrl() {
    return new LabeledInputPo('.labeled-input', `:contains("Console URL")`)
  }

  cleanValue(){
    this.customName().clear();
    this.consoleUrl().clear();
  }

  setValue(value:ValueInterface) {
    this.customName().input(value.customName)
    this.consoleUrl().input(value.consoleUrl)
  }

  enableMaintenance(nodeName: string) {
    cy.intercept('POST', `/v1/harvester/${this.realType}s/${nodeName}?action=enableMaintenanceMode`).as('enable');
    this.clickAction(nodeName, 'Enable Maintenance Mode');
    // Maintenance
    cy.get('.card-container').contains('Apply').click();
    cy.wait('@enable').then(res => {
      expect(res.response?.statusCode, `Enable maintenance ${nodeName}`).to.equal(204);
    })
  }

  public update(id:string) {
    const saveButtons = '.buttons > .right'
    
    cy.intercept('PUT', `/v1/harvester/${this.realType}s/${id}`).as('update');
    cy.get(saveButtons).contains('Save').click()
    cy.wait('@update').then(res => {
      expect(res.response?.statusCode, `Check edit ${id}`).to.equal(200);
    })
  }
}
