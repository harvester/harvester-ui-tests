import PagePo from '@/utils/components/page.po';
import { Constants, PageUrl } from "@/constants/constants";
import LabeledInputPo from '@/utils/components/labeled-input.po';
import LabeledSelectPo from '@/utils/components/labeled-select.po';
import CheckboxPo from '@/utils/components/checkbox.po';

const constants = new Constants();

export interface CatalogFormValues {
  distro?: string;
  image?: string;
  series?: string;
  size?: string;
  name?: string;
  namespace?: string;
  network?: string;
  diskGi?: number | string;
  sshKeys?: string[];
  password?: string;
  start?: boolean;
}

export class CatalogPage extends PagePo {
  constructor() {
    super(PageUrl.catalog);
  }

  /**
   * Navigate to the catalog page and wait for content to load
   */
  public goToCatalog() {
    this.goTo();
    cy.get('.vm-catalog__header h1', { timeout: constants.timeout.maxTimeout }).should('be.visible').and('contain', 'Catalog');
    cy.get('.loading').should('not.exist');
  }

  // --- Header ---

  public get headerTitle() {
    return cy.get('.vm-catalog__header h1');
  }

  public get headerDescription() {
    return cy.get('.vm-catalog__header p');
  }

  public get loadErrors() {
    return cy.get('.banner.color-warning');
  }

  public get formErrors() {
    return cy.get('.banner.color-error');
  }

  // --- Step 1: Operating System ---

  public get step1() {
    return cy.get('.vm-catalog__step').eq(0);
  }

  public get distroGrid() {
    return cy.get('.distro-grid');
  }

  public get distros() {
    return cy.get('.distro');
  }

  public get emptyImageNotice() {
    return this.step1.find('.text-muted').contains('No bootable disk images yet');
  }

  public getDistroTile(labelOrKey: string) {
    return cy.get('.distro').contains(labelOrKey).closest('.distro');
  }

  public selectDistro(labelOrKey: string) {
    this.getDistroTile(labelOrKey).click();
    this.getDistroTile(labelOrKey).should('have.class', 'is-selected').and('have.attr', 'aria-checked', 'true');
  }

  public get selectedDistro() {
    return cy.get('.distro.is-selected');
  }

  public get imageSelect() {
    return new LabeledSelectPo('.vm-catalog__step .labeled-select', ':contains("Image")');
  }

  public selectImage(imageName: string) {
    this.imageSelect.select({ option: imageName });
  }

  // --- Step 2: Size ---

  public get step2() {
    return cy.get('.vm-catalog__step').eq(1);
  }

  public get seriesTabs() {
    return cy.get('.series__tab');
  }

  public selectSeries(seriesLabelOrKey: string) {
    cy.get('.series__tab').contains(seriesLabelOrKey).click();
    cy.get('.series__tab').contains(seriesLabelOrKey).closest('.series__tab').should('have.class', 'is-selected');
  }

  public get sizes() {
    return cy.get('.size');
  }

  public getSizeTile(sizeName: string) {
    return cy.get('.size').contains(sizeName).closest('.size');
  }

  public selectSize(sizeName: string) {
    this.getSizeTile(sizeName).click();
    this.getSizeTile(sizeName).should('have.class', 'is-selected').and('have.attr', 'aria-checked', 'true');
  }

  public get selectedSize() {
    return cy.get('.size.is-selected');
  }

  public get toggleAllSizesButton() {
    return cy.get('.vm-catalog__step').eq(1).find('button.role-link');
  }

  public toggleAllSizes() {
    this.toggleAllSizesButton.click();
  }

  // --- Step 3: Details ---

  public get step3() {
    return cy.get('.vm-catalog__step').eq(2);
  }

  public name() {
    return new LabeledInputPo('.details .labeled-input', ':contains("Name")');
  }

  public getNameValue() {
    return cy.get('.details .labeled-input').contains('Name').parents('.labeled-input').find('input').invoke('val');
  }

  public getNameError() {
    return cy.get('.details .labeled-input').contains('Name').parents('.labeled-input').find('.sub-label');
  }

  public namespace() {
    return new LabeledSelectPo('.details .labeled-select', ':contains("Namespace")');
  }

  public network() {
    return new LabeledSelectPo('.details .labeled-select', ':contains("Network")');
  }

  public rootDisk() {
    return new LabeledInputPo('.details .labeled-input', ':contains("Root disk")');
  }

  public getDiskError() {
    return cy.get('.details .labeled-input').contains('Root disk').parents('.labeled-input').find('.sub-label');
  }

  public sshKeys() {
    return new LabeledSelectPo('.details .labeled-select', ':contains("SSH keys")');
  }

  public password() {
    return new LabeledInputPo('.details .labeled-input', ':contains("Console password")');
  }

  public startAfterCreation() {
    return new CheckboxPo('.details .checkbox-container', ':contains("Start after creation")');
  }

  // --- Waiting states ---

  public isStepWaiting(stepIndex: 1 | 2 | 3) {
    return cy.get('.vm-catalog__step').eq(stepIndex - 1).should('have.class', 'is-waiting');
  }

  public isStepNotWaiting(stepIndex: 1 | 2 | 3) {
    return cy.get('.vm-catalog__step').eq(stepIndex - 1).should('not.have.class', 'is-waiting');
  }

  // --- Footer & Preview ---

  public get summary() {
    return cy.get('.vm-catalog__footer .vm-catalog__summary');
  }

  public get previewButton() {
    return cy.get('.vm-catalog__footer button').contains('Preview spec');
  }

  public get createButton() {
    return cy.get('.vm-catalog__footer [data-testid="action-button-async-button"]');
  }

  public get previewSection() {
    return cy.get('.preview');
  }

  public get previewRefs() {
    return cy.get('.preview div').eq(0).find('pre');
  }

  public get previewDomain() {
    return cy.get('.preview div').eq(1).find('pre');
  }

  public clickPreviewSpec() {
    this.previewButton.click();
    this.previewSection.should('be.visible');
  }

  public clickCreate() {
    this.createButton.click();
  }
}
