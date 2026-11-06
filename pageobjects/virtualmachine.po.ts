import { Constants } from "@/constants/constants";
import { HCI } from '@/constants/types';
import LabeledSelectPo from '@/utils/components/labeled-select.po';
import LabeledInputPo from '@/utils/components/labeled-input.po';
import LabeledTextAreaPo from '@/utils/components/labeled-textarea.po';
import RadioButtonPo from '@/utils/components/radio-button.po';
import CheckboxPo from '@/utils/components/checkbox.po';
import { ImagePage } from "@/pageobjects/image.po";
import CruResourcePo from '@/utils/components/cru-resource.po';
import YamlEditorPo from '@/utils/components/yaml-editor.po';

const constants = new Constants();
const image = new ImagePage();

interface Network {
  network?: string,
}

interface ValueInterface {
  namespace?: string,
  name?: string,
  description?: string,
  cpu?: string,
  memory?: string,
  image?: string,
  diskSize?: string,
  networks?: Array<Network>,
  createRunning?: boolean,
  usbTablet?: boolean,
  efiEnabled?: boolean,
  userData?: string,
  networkData?: string,
}

interface Volume {
  buttonText: string,
  create?: boolean,
  [index: string]: any
}

export class VmsPage extends CruResourcePo {
  constructor() {
    super({
      type: HCI.VM
    });
  }

  setBasics(cpu?: string, memory?: string, ssh?: { id?: string, createNew?: boolean, value?: string }) {
    this.clickTab('basics');
    this.cpu().input(cpu);
    this.memory().input(memory);

    if (ssh && ssh.id) {
      new LabeledSelectPo('.labeled-select', `:contains("SSHKey")`).select({ option: ssh.id });
    } else if (ssh && ssh.createNew) {
      new LabeledSelectPo('.labeled-select', `:contains("SSHKey")`).select({ option: 'Create a New...' });
      new LabeledTextAreaPo('.v--modal-box .card-container .labeled-input', `:contains("SSH-Key")`).input(ssh.value, {
        delay: 0,
      });

      cy.get('.v--modal-box .card-container').contains('Create').click();
    }
  }

  setVolumes(volumes: Array<Volume>) {
    this.clickTab('Volume');
    cy.wrap('async').then(() => {
      volumes.map((volume) => {
        if (volume.create) {
          cy.get('.tab-container button').contains(volume.buttonText).click()
        }
      });

      volumes.map((volume, index) => {
        let imageEl: any;
        let volumeEl: any;
        cy.get('.info-box').eq(index).within(() => {
          if (volume.image) {
            imageEl = new LabeledSelectPo('.labeled-select', `:contains("Image")`);
          }

          if (volume.size) {
            new LabeledInputPo('.labeled-input', `:contains("Size")`).input(volume.size);
          }

          if (volume.volume) {
            volumeEl = new LabeledSelectPo('.labeled-select', `:contains("Volume")`);
          }
        }).then(() => {
          if (imageEl) {
            imageEl.select({ option: volume.image });
          }

          if (volumeEl) {
            volumeEl.select({ option: volume.volume });
          }
        })
      })
    })
  }

  selectSchedulingType({ type = 'any' }: { type: string }) {
    const map: any = {
      any: 'Run virtual machine on any available node',
      specific: 'Run virtual machine on specific node - (Live migration is not supported)',
      rules: 'Run virtual machine on node(s) matching scheduling rules'
    }

    this.clickTab('nodeScheduling');

    cy.get('.tab-container section#nodeScheduling').within(() => {
      const scheduling = new RadioButtonPo('.radio-group');

      scheduling.input(map[type]);
    })
  }

  checkSpecificNodes({ includeNodes = [], excludeNodes = [] }: { includeNodes: Array<string>, excludeNodes?: Array<string> }) {
    this.specificNode().self().click();
    includeNodes.forEach((node) => cy.get('.vs__dropdown-menu').should('contain', node));
    excludeNodes.forEach((node) => cy.get('.vs__dropdown-menu').should('not.contain', node));
  }

  setAdvancedOption(option: { [index: string]: any }) {
    this.clickTab('advanced');

    if (option.runStrategy) {
      new LabeledSelectPo('.labeled-select', `:contains("Run Strategy")`).select({ option: option.runStrategy });
    }

    if ([true, false].includes(option.efiEnabled)) {
      this.efiEnabled().check(option.efiEnabled)
    }

    if (option.userData) {
      this.userData().input(option?.userData)
    }

    if (option.networkData) {
      this.networkData().input(option?.networkData)
    }
  }

  checkVMState(name: string, state: string = 'Running', namespace: string = 'default') {
    this.goToList();
    this.censorInColumn(name, 3, namespace, 4, state, 2, { timeout: constants.timeout.provisionTimeout, nameSelector: '.name-console a' });
  }

  clickCloneAction(name: string) {
    this.clickAction(name, 'Clone');
    new CheckboxPo('.v--modal-box .checkbox-container', `:contains("clone volume data")`).check(false);
    cy.get('.v--modal-box button').contains('Clone').click();
  }

  clickVMSnapshotAction(name: string, snapshotName: string) {
    this.clickAction(name, 'Take Virtual Machine Snapshot');
    cy.get('.modal-container .card-title').find('h4').contains('Take Virtual Machine Snapshot');

    new LabeledInputPo('.modal-container .labeled-input', `:contains("Name *")`).input(snapshotName)
    cy.get('.modal-container button').contains('Create').click();
    cy.get('.growl-container .growl-list').find('.growl-text div').contains('Succeed');
  }


  clickVMBackupAction(name: string, backupName: string) {
    this.clickAction(name, 'Take Backup');
    cy.get('.modal-container .card-title').find('h4').contains('Add Backup');

    new LabeledInputPo('.modal-container .labeled-input', `:contains("Name")`).input(backupName)
    cy.get('.modal-container button').contains('Create').click();
    cy.get('.growl-container .growl-list').find('.growl-text div').contains('Succeed');
  }

  clickMigrateAction(name: string, targetNode: string) {
    this.clickAction(name, 'Virtual Machine Migration');
    cy.get('[data-testid="card-title-slot"]').contains('Migrating');

    const nodeNameSelector = new LabeledSelectPo('.labeled-select', `:contains("Target Node")`)
    nodeNameSelector.select({ option: targetNode, selector: '.vs__dropdown-menu' });

    cy.get('.modal-container button').contains('Apply').click();
  }

  public setValue(value: ValueInterface) {
    this.namespace().select({ option: value?.namespace })
    this.name().input(value?.name)
    this.description().input(value?.description)
    this.cpu().input(value?.cpu)
    this.memory().input(value?.memory)
    this.clickTab('Volume')
    this.selectImage(value?.image)
    this.diskSize().input(value?.diskSize)
    this.networks(value?.networks)
    this.clickTab('advanced')
    this.usbTablet().check(value?.usbTablet)
    this.efiEnabled().check(value?.efiEnabled)
    // userData() and networkData() query the editors right away, only use them when needed
    if (value?.userData) {
      this.userData().input(value.userData)
    }
    if (value?.networkData) {
      this.networkData().input(value.networkData)
    }
  }

  public save({
    edit = false,
  } = {}) {
    if (edit) {
      cy.intercept('PUT', '/v1/harvester/kubevirt.io.virtualmachines/*/*').as('createVM');
      cy.get('.cru-resource-footer').contains('Save').click()
      cy.get('.card-actions').contains('Save and Restart').click()
    } else {
      cy.intercept('POST', '/v1/harvester/kubevirt.io.virtualmachines/*').as('createVM');
      cy.get('.cru-resource-footer').contains('Create').click()
    }

    cy.wait('@createVM').then(res => {
      expect(res.response?.statusCode).to.be.oneOf([201, 200]);
    })
  }

  public cpu() {
    return new LabeledInputPo('.labeled-input', `:contains("CPU")`)
  }

  public memory() {
    return new LabeledInputPo('.labeled-input', `:contains("Memory")`)
  }

  public image() {
    return new LabeledSelectPo('.labeled-select', `:contains("Image")`)
  }

  /**
   * Select an image on the Volumes tab by its exact name. Options are `<namespace>/<name>`, optionally followed by
   * ` (<storage class> / <size>)`, so a plain text match could pick another image whose name starts with the same text.
   */
  public selectImage(name?: string) {
    if (!name) {
      return
    }

    this.image().self().first().click();
    const escaped = Cypress._.escapeRegExp(name);

    cy.contains('.vs__dropdown-menu .vs__dropdown-option', new RegExp(`^\\s*([^/\\s]+/)?${escaped}(\\s+\\(.*\\))?\\s*$`)).click();
  }

  public diskSize() {
    return new LabeledInputPo('.info-box .labeled-input', `:contains("Size")`)
  }

  deleteVMFromStore(id: string) {
    this.deleteFromStore(id); // Delete the previously created vm
    this.deleteFromStore(id, HCI.VMI); // You need to wait for the vmi to be deleted as well, because it will not be deleted until the vm is deleted
  }

  deleteVMFromUI(namespace: string, name: string) {
    this.goToList();
    this.clickAction(name, 'Delete');
    cy.get('[data-testid="card"]').get('[type="checkbox"]').each(($checkbox) => {
      if (!$checkbox.is(':checked')) {
        $checkbox.click();
      }
    });

    cy.get('[data-testid="prompt-remove-confirm-button"]').contains('Delete').click();
  }

  network() {
    return new LabeledSelectPo('section .labeled-select.hoverable', `:contains("Network")`)
  }

  rootDisk() {
    return cy.get(this.confirmRemove).find('.checkbox-container span[role="checkbox"].checkbox-custom');
  }

  template() {
    return new LabeledSelectPo(cy.get('.labeled-select').contains('Template').eq(0));
  }

  version() {
    return new LabeledSelectPo(cy.get('.labeled-select').contains('Version'));
  }

  multipleInstance() {
    return new RadioButtonPo('.radio-group', ':contains("Multiple Instance")')
  }

  namePrefix() {
    return new LabeledInputPo('.labeled-input', `:contains("Name Prefix")`)
  }

  count() {
    return new LabeledInputPo('.labeled-input', `:contains("Count")`)
  }

  plugVolumeCustomName() {
    return new LabeledInputPo('.labeled-input', `:contains("Name")`);
  }

  plugVolumeName() {
    return new LabeledSelectPo('.labeled-select', `:contains("Volume")`);
  }

  specificNode() {
    return new LabeledSelectPo('.labeled-select', `:contains("Node Name")`);
  }

  networks(networks: Array<Network> = []) {
    if (networks.length === 0) {
      return
    } else {
      this.clickTab('Network')

      cy.get('[data-testid="input-hen-networkName"]').then(elms => {
        if (elms?.length < networks?.length) {
          for (let i = 0; i < networks?.length - elms?.length; i++) {
            cy.contains('Add Network').click()
          }
        }

        networks.map((n, idx) => {
          this.network().select({ option: n?.network, index: idx })
        })
      })
    }
  }

  goToConfigDetail(name: string) {
    this.goToList();
    cy.get('.search').type(name)
    const vm = cy.contains(name)
    expect(vm.should('be.visible'))
    vm.click()

    const config = cy.get('[data-testid="show-configuration-cta"]').contains('Show Configuration')
    expect(config.should('be.visible'));
    config.click()
  }

  public openDetailPanel(name: string) {
    this.goToList();
    cy.get('.search').type(name);

    const vm = cy.contains('.name-console a', name);
    expect(vm.should('be.visible'));
    vm.click();
  }

  public clickMigrationTab() {
    cy.get('[data-testid="btn-migration"]').click();
  }

  public readDetailLabelValue(label: string): Cypress.Chainable<string> {
    return cy.contains('.label .text-label', label)
      .parent()
      .find('.value')
      .invoke('text')
      .then((text) => text.trim());
  }

  /**
   * Check if the node value from an alias matches the expected detail label value
   * @param nodeName - The Cypress alias (e.g., '@sourceNode', '@targetNode')
   * @param labelValue - The label text to read from the detail panel (e.g., 'Source Node', 'Target Node')
   */
  public checkNode(nodeName: string, labelValue: string) {
    cy.get(nodeName).then((node) => {
      const expectedNode = String(node).trim();

      this.readDetailLabelValue(labelValue).then((nodeDetailValue) => {
        const detailNode = nodeDetailValue.replace(/\s+/g, ' ').trim();
        expect(detailNode).to.eq(expectedNode);
      });
    });
  }

  /**
   * Verify that a VM has successfully migrated to a target node
   * Checks that the VM is now running on the target node and not on the original node
   * @param vmName - The name of the virtual machine
   * @param targetNodeName - The target node where the VM should have migrated
   * @param originalNode - The original node where the VM was running
   */
  public verifyMigrationSuccess(vmName: string, targetNodeName: string, originalNode: string) {
    cy.contains('tr', vmName)
      .find('td')
      .eq(7)
      .invoke('text')
      .then((newNodeName) => {
        const currentNode = newNodeName.trim();
        expect(currentNode).to.equal(targetNodeName);
        expect(currentNode).to.not.equal(originalNode);
        cy.log(`Migration successful: ${originalNode} → ${currentNode}`);
      });
  }

  goToYamlEdit(name: string) {
    this.goToList();

    this.clickAction(name, 'Edit YAML')
  }

  /**
   * Click the Config tab in the configuration panel
   */
  public clickConfigTab() {
    cy.get('[data-testid="btn-config-tab"]').click();
  }

  /**
   * Click the YAML tab in the configuration panel
   */
  public clickYamlTab() {
    cy.get('[data-testid="btn-yaml-tab"]').click();
  }

  /**
   * Click the Close button in the configuration panel
   */
  public clickCloseConfigPanel() {
    cy.get('.footer .btn.role-secondary').contains('Close').click();
  }

  /**
   * Click the Edit Config button in the configuration panel
   */
  public clickEditConfig() {
    cy.get('.footer .btn.role-primary').contains('Edit Config').click();
  }

  /**
   * Click the Edit YAML button in the configuration panel (when on YAML tab)
   */
  public clickEditYaml() {
    cy.get('.footer .btn.role-primary').contains('Edit YAML').click();
  }

  /**
   * Close the YAML panel by clicking the Close button
   */
  public closeYamlPanel() {
    cy.get('.footer .btn.role-secondary').contains('Close').click();
  }

  public init() {
    cy.intercept('GET', `v1/harvester/${HCI.IMAGE}s*`).as('imageList');
    image.goToList();

    cy.wait('@imageList').should((res: any) => {
      expect(res.response?.statusCode, 'Check Image list').to.equal(200);
      const images = res?.response?.body?.data || []

      const imageEnv = Cypress.env('image');

      const name = Cypress._.toLower(imageEnv.name)
      const url = imageEnv.url
      const imageFound = images.find((i: any) => i?.spec?.displayName === name)

      if (imageFound) {
        return
      } else {
        const namespace = 'default';

        image.goToCreate();
        image.setNameNsDescription(name, namespace);
        image.setBasics({ url });
        image.save();
        image.checkState({ name, namespace });
      }
    })
  }

  public checkState({ name = '', namespace = 'default', state = 'Running' }: { name?: string, namespace?: string, state?: string }) {
    this.censorInColumn(name, 3, namespace, 4, state, 2, { timeout: constants.timeout.maxTimeout, nameSelector: '.name-console a' });
  }

  public goToEdit(name: string) {
    this.goToList()
    cy.get('.search').type(name)
    const vm = cy.contains(name)
    expect(vm.should('be.visible'))
    vm.parentsUntil('tbody', 'tr').find('.icon-actions').click()

    cy.get('.dropdownTarget').contains('Edit Config').click()
  }

  public edit(name: string, value: ValueInterface, namespace: string = 'default') {
    this.init()
    this.goToEdit(name);
    // Reload the page to avoid api conflicting issue
    cy.reload();
    this.setValue(value);
    // A running VM's edit requires confirming the "Save and Restart" prompt,
    this.save({ edit: true });
  }

  public delete(namespace: string, name: string, displayName?: string, { removeRootDisk, id }: { removeRootDisk?: boolean, id?: string } = { removeRootDisk: true }) {
    cy.visit(`/harvester/c/local/${this.type}`)

    this.clickAction(name, 'Delete').then((_) => {
      if (!removeRootDisk) {
        this.rootDisk().click({force: true});
      }
    })

    cy.intercept('DELETE', `/v1/harvester/${this.realType}s/${namespace}/${name}*`).as('delete');
    cy.get(this.confirmRemove).contains('Delete').click();
    cy.wait('@delete').then(res => {
      cy.window().then((win) => {
        const id = `${namespace}/${name}`;
        super.checkDelete(this.type, id, 240)
        expect(res.response?.statusCode, `Delete ${this.type}`).to.be.oneOf([200, 204]);
      })
    })
  }

  public plugVolume(vmName: string, volumeNames: Array<string>, namespace: string) {
    this.goToList();
    cy.wait(2000);
    cy.wrap(volumeNames).each((V: string) => {
      // reload the page before plugging a new volume
      cy.wait(5000);
      cy.reload()
      this.clickAction(vmName, 'Add Volume').then((_) => {
        cy.get('.modal-container .card-container').within(() => {
          this.plugVolumeCustomName().input(V);
        })
        this.plugVolumeName().select({ option: V });
      })
      cy.intercept('POST', `/v1/harvester/${this.realType}s/${namespace}/${vmName}*`).as('plug');
      cy.get('.modal-container .card-container').contains('Apply').click();
      cy.wait('@plug').then(res => {
        expect(res.response?.statusCode, `${this.type} plug Volume`).to.be.oneOf([200, 204]);
        this.searchClear();
      })
    })
  }

  public unplugVolume(vmName: string, volumeIndexArray: Array<number>, namespace: string) {
    this.goToList();
    cy.get('.search').type(vmName)
    const vm = cy.contains(vmName)
    expect(vm.should('be.visible'))
    vm.click()
    // Click the volume tab
    cy.get('[data-testid="disks"]').click();

    cy.wrap(volumeIndexArray).each((index: number) => {
      cy.wait(2000);
      cy.get('.info-box').eq(index).contains('Detach Volume').click();
      cy.intercept('POST', `/v1/harvester/${this.realType}s/${namespace}/${vmName}*`).as('unplug');
      cy.get('.modal-container .card-container').contains('Apply').click();
      cy.wait('@unplug').then(res => {
        expect(res.response?.statusCode, `${this.type} unplug Volume`).to.be.oneOf([200, 204]);
      })
    })
  }

  usbTablet() {
    return new CheckboxPo('.checkbox-container', `:contains("Enable USB Tablet")`)
  }

  guestAgent() {
    return new CheckboxPo('.checkbox-container', `:contains("Install guest agent")`)
  }

  efiEnabled() {
    return new CheckboxPo('.checkbox-container', `:contains("Booting in EFI mode")`)
  }

  userData() {
    const selector = cy.contains('User Data').parent().find('.CodeMirror')

    return new YamlEditorPo(selector)
  }

  networkData() {
    const selector = cy.contains('Network Data').parent().find('.CodeMirror')

    return new YamlEditorPo(selector)
  }

  public selectTemplateAndVersion({ name, namespace, id, version }: {
    name?: string,
    namespace?: string,
    id?: string,
    version?: string,
  }) {
    cy.contains('Use the virtual machine template').click()
    this.template().select({ option: id || `${namespace}/${name}` })
    this.version().select({
      option: version,
      selector: '.vs__dropdown-menu',
    })
  }

  public sshWithCommand(
    vmName: string,
    username: string,
    password: string,
    remoteCommand: string,
    checkResult: boolean = true,
    expectedResult?: string,
    timeout: number = constants.timeout.uploadTimeout
  ) {
    // Wait for IP address to be available in the table
    this.censorInColumn(vmName, 3, 'default', 4, '.', 7, {
      timeout,
      nameSelector: '.name-console a'
    });

    // Get IP address and execute SSH command
    cy.contains('tr', vmName)
      .find('[data-testid="sortable-cell-0-5"] > .ip-list > .ip-item > .copy-to-clipboard-text')
      .then($els => {
        const address = $els[0]?.innerText;

        // Use Cypress's built-in retry mechanism with should()
        cy.wrap(null).should(() => {
          cy.task('sshWithPassword', {
            username,
            password,
            host: address,
            remoteCommand,
          })
          .then((result: any) => {
            cy.log(`SSH result: ${JSON.stringify(result)}`);

            if (checkResult) {
              // Validate that expectedResult is provided when checkResult is true
              if (!expectedResult) {
                throw new Error('expectedResult must be provided when checkResult is true');
              }
              expect(result.stdout).to.include(expectedResult);
            }
            // If checkResult is false, just log the result and continue
          });
        });
      });
  }

  selectMultipleInstance() {
    this.multipleInstance().input('Multiple Instance')
  }

  setMultipleInstance({ namePrefix, count }: {
    namePrefix?: string,
    count?: string,
  }) {
    this.selectMultipleInstance()
    this.namePrefix().input(namePrefix)
    this.count().input(count)
  }

  setNodeScheduling({
    radio, nodeName, selector
  }: {
    radio?: 'any' | 'specific' | 'rules',
    nodeName?: string,
    selector?: any,
  }) {
    this.clickTab('nodeScheduling');

    const rulesRadio = new RadioButtonPo('.radio-group', ':contains("Run virtual machine on node(s) matching scheduling rules")')
    const specificRadio = new RadioButtonPo('.radio-group', ':contains("Run virtual machine on specific node - (Live migration is not supported)")')
    const nodeNameSelector = new LabeledSelectPo('.labeled-select', `:contains("Node Name")`)

    switch (radio) {
      case 'rules':
        rulesRadio.input('Run virtual machine on node(s) matching scheduling rules')
        break;
      case 'specific':
        specificRadio.input('Run virtual machine on specific node - (Live migration is not supported)')

        nodeNameSelector.select({
          selector: '.vs__dropdown-menu',
          option: nodeName,
        })
        break;
    }
  }

  /**
   * Open Edit Config of a VM with the latest VM from the API, e.g. after a live migration changed it
   */
  public goToEditConfig(name: string, namespace: string = 'default') {
    cy.visit(`/harvester/c/local/${this.type}/${namespace}/${name}?mode=edit`);
    cy.get(this.footerButtons, { timeout: constants.timeout.maxTimeout }).contains('Save').should('be.visible');
  }

  /**
   * Delete a VM and its disks through the API, e.g. to clean up after a suite
   */
  public deleteVMByApi(name: string, namespace: string = 'default') {
    cy.request({ url: this.vmApiUrl(name, namespace), headers: { accept: 'application/json' }, failOnStatusCode: false }).then((res) => {
      if (res.status !== 200) {
        cy.log(`VM ${namespace}/${name} not found: ${res.status}`);

        return;
      }

      const volumes: any[] = res.body?.spec?.template?.spec?.volumes || [];
      const disks = volumes.filter((V) => V.persistentVolumeClaim).map((V) => `removedDisks=${V.name}`).join('&');

      // Steve rejects a cookie-authenticated DELETE without the CSRF header
      cy.getCookie('CSRF').then((csrf) => {
        cy.request({
          method: 'DELETE',
          url: `${this.vmApiUrl(name, namespace)}?${disks}&propagationPolicy=Foreground`,
          headers: { 'x-api-csrf': csrf?.value },
          failOnStatusCode: false,
        }).then((del) => {
          expect(del.status, `Delete VM ${namespace}/${name}: ${JSON.stringify(del.body)}`).to.be.oneOf([200, 204]);
        });
      });
    });
  }

  /**
   * Select a network for an existing NIC on the Networks tab of the VM form, matching the option exactly
   * @param network - `<namespace>/<name>` of the VM network
   * @param index - index of the NIC on the Networks tab
   */
  public selectNicNetwork(network: string, index: number = 0) {
    this.clickTab('Network');
    cy.get('[data-testid="input-hen-networkName"] .labeled-select').eq(index).click();
    // Options are `<namespace>/<name>`, followed by `(Not Ready)` if the network is not ready
    const escaped = Cypress._.escapeRegExp(network);

    cy.contains('.vs__dropdown-menu .vs__dropdown-option', new RegExp(`^\\s*${escaped}(\\s+\\(.*\\))?\\s*$`)).click();
    cy.get('[data-testid="input-hen-networkName"] .labeled-select').eq(index).find('.vs__selected').should('contain', network);
  }

  /**
   * Info banner shown under a NIC when its network can be changed via live migration
   */
  public liveNetworkChangeBanner() {
    return cy.get('[data-testid="banner-live-network-change"]');
  }

  /**
   * "Restart Virtual Machine" dialog shown after saving a running VM
   */
  public restartDialog() {
    return cy.get('.prompt-restart');
  }

  /**
   * Save the edit form of a running VM.
   * The restart dialog is an after-save hook: the VM spec is already saved when it is shown.
   * @param expectRestartPrompt - whether the restart dialog is expected
   * @param restart - when the dialog is shown, click "Save and Restart" instead of "Save"
   */
  public saveEdit({ expectRestartPrompt, restart = false }: { expectRestartPrompt: boolean, restart?: boolean }) {
    cy.intercept('PUT', `/v1/harvester/${HCI.VM}s/*/*`).as('editVM');
    cy.get(this.footerButtons).contains('Save').click();
    cy.wait('@editVM').then(res => {
      expect(res.response?.statusCode, 'Edit VM').to.equal(200);
    });

    if (expectRestartPrompt) {
      this.restartDialog().should('be.visible')
        .and('contain', 'Restart Virtual Machine')
        .and('contain', 'Restart the virtual machine for configuration changes to take effect.');
      this.restartDialog().find('button').contains(restart ? /^\s*Save and Restart\s*$/ : /^\s*Save\s*$/).click();
      this.restartDialog().should('not.exist');
    } else {
      // The edit page goes back to the list only after the after-save hooks resolve, an open restart dialog blocks it
      cy.location('pathname', { timeout: constants.timeout.maxTimeout }).should('match', new RegExp(`/${HCI.VM}$`));
      this.restartDialog().should('not.exist');
    }
  }

  /**
   * Poll an API resource until `predicate` returns true and yield the resource
   */
  public waitForResource(url: string, predicate: (resource: any) => boolean, description: string, { retries = 60, interval = 5000 } = {}): Cypress.Chainable<any> {
    const poll = (attempt: number): Cypress.Chainable<any> => {
      return cy.request({ url, headers: { accept: 'application/json' }, failOnStatusCode: false, log: false }).then((res) => {
        if (res.status === 200 && predicate(res.body)) {
          cy.log(`${description}: done`);

          return cy.wrap(res.body, { log: false });
        }

        if (attempt >= retries) {
          throw new Error(`Timed out waiting for ${description}`);
        }

        cy.wait(interval, { log: false });

        return poll(attempt + 1);
      });
    };

    return poll(1);
  }

  public vmApiUrl(name: string, namespace: string = 'default') {
    return `/v1/harvester/${HCI.VM}s/${namespace}/${name}`;
  }

  public vmiApiUrl(name: string, namespace: string = 'default') {
    return `/v1/harvester/${HCI.VMI}s/${namespace}/${name}`;
  }

  public getVmi(name: string, namespace: string = 'default'): Cypress.Chainable<any> {
    return cy.request({ url: this.vmiApiUrl(name, namespace), headers: { accept: 'application/json' } }).its('body');
  }

  /**
   * Yield the multus network name (`<namespace>/<name>`) of a NIC in the VM spec
   */
  public getNicNetworkName(name: string, namespace: string = 'default', nic?: string): Cypress.Chainable<string> {
    return cy.request({ url: this.vmApiUrl(name, namespace), headers: { accept: 'application/json' } }).then((res) => {
      const networks: any[] = res.body?.spec?.template?.spec?.networks || [];
      const network = networks.find((N) => N.multus && (!nic || N.name === nic));

      return network?.multus?.networkName as string;
    });
  }

  /**
   * Wait until the VM is running, can be live-migrated and has no migration in progress
   * @param previousVmiUid - also wait for a new VMI, e.g. after a restart
   */
  public waitForLiveMigratable(name: string, namespace: string = 'default', { previousVmiUid }: { previousVmiUid?: string } = {}) {
    this.waitForResource(this.vmApiUrl(name, namespace), (vm) => {
      return vm?.status?.printableStatus === 'Running' && !!vm?.actions?.migrate;
    }, `VM ${namespace}/${name} running with the migrate action`);

    return this.waitForResource(this.vmiApiUrl(name, namespace), (vmi) => {
      const migration = vmi?.status?.migrationState;
      const liveMigratable = (vmi?.status?.conditions || []).some((C: any) => C.type === 'LiveMigratable' && C.status === 'True');

      return vmi?.status?.phase === 'Running' &&
        liveMigratable &&
        (!previousVmiUid || vmi?.metadata?.uid !== previousVmiUid) &&
        (!migration || migration.completed || migration.failed);
    }, `VMI ${namespace}/${name} running and live-migratable`);
  }

  /**
   * Wait until a live migration moved the running VM to `network` (KubeVirt LiveUpdateNADRef) and check that the VM
   * did not restart and does not require one
   */
  public waitForLiveNetworkChange(name: string, network: string, namespace: string = 'default', { vmi: previousVmi }: { vmi: any }) {
    const vmiUid = previousVmi?.metadata?.uid;
    const previousMigrationUid = previousVmi?.status?.migrationState?.migrationUid;

    this.waitForResource(this.vmiApiUrl(name, namespace), (vmi) => {
      const networks: any[] = vmi?.spec?.networks || [];
      const migration = vmi?.status?.migrationState;

      return networks.some((N) => N.multus?.networkName === network) &&
        !!migration?.completed &&
        !migration?.failed &&
        migration?.migrationUid !== previousMigrationUid;
    }, `VMI ${namespace}/${name} live-migrated to ${network}`).then((vmi) => {
      expect(vmi.metadata.uid, 'VMI was not restarted').to.equal(vmiUid);
      expect(vmi.status.phase).to.equal('Running');
    });

    return cy.request({ url: this.vmApiUrl(name, namespace), headers: { accept: 'application/json' } }).then((res) => {
      const conditions: any[] = res.body?.status?.conditions || [];

      expect(conditions.some((C) => C.type === 'RestartRequired' && C.status === 'True'), 'VM requires no restart').to.equal(false);
    });
  }
}
