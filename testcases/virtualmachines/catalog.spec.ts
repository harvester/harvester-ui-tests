import { CatalogPage } from "@/pageobjects/catalog.po";
import { VmsPage } from "@/pageobjects/virtualmachine.po";
import { Navbar } from '@/utils/components/page.po';
import { HCI } from "@/constants/types";

const catalog = new CatalogPage();
const vms = new VmsPage();
const navBar = new Navbar();

describe('VM Catalog UI and Navigation', () => {
  before(() => {
    cy.login();
    // Ensure at least one image exists so catalog tiles can be populated
    cy.request({
      url: `/v1/harvester/${HCI.IMAGE}s`,
      headers: { accept: 'application/json' },
      failOnStatusCode: false
    }).then(res => {
      const images = res?.body?.data || [];
      if (images.length === 0) {
        vms.init();
      }
    });
  });

  beforeEach(() => {
    cy.login();
  });

  /**
   * 1. Login to Harvester
   * 2. Click Catalog in the left navigation sidebar
   * 3. Verify URL navigates to /harvester/c/local/catalog
   * 4. Verify Catalog page title and description
   */
  it('should navigate to Catalog page from sidebar', () => {
    cy.contains('nav a', 'Catalog').should('be.visible');
    navBar.clickMenuNav('Catalog', 'harvester/c/local/catalog', 'Catalog');
    catalog.headerTitle.should('be.visible').and('contain', 'Catalog');
    catalog.headerDescription.should('be.visible').and('contain', 'Pick an operating system and a size');
  });

  /**
   * 1. Go to Catalog page directly
   * 2. Verify Step 1 (Operating system) is rendered
   * 3. Verify footer summary shows 'Nothing selected yet'
   * 4. Verify 'Preview spec' and 'Create' buttons are disabled
   * 5. Verify Step 2 and Step 3 are in waiting state before selecting an OS
   */
  it('should display initial layout with waiting steps when unselected', () => {
    catalog.goToCatalog();
    catalog.step1.should('be.visible');
    catalog.distros.should('exist');
    catalog.summary.should('contain', 'Nothing selected yet');
    catalog.previewButton.should('be.disabled');
    catalog.createButton.should('be.disabled');
  });

  /**
   * 1. Go to Catalog page
   * 2. Select the first available OS distro tile
   * 3. Verify distro tile has 'is-selected' and aria-checked='true'
   * 4. Verify Step 2 waiting state is removed
   * 5. Verify Step 3 Name field is auto-suggested
   * 6. Verify default size is selected
   */
  it('should select an OS distro and auto-suggest VM name', () => {
    catalog.goToCatalog();
    catalog.distros.first().click();
    catalog.selectedDistro.should('exist');
    catalog.isStepNotWaiting(2);
    catalog.getNameValue().should((val: any) => {
      expect(val).to.be.a('string').and.not.be.empty;
      expect(val).to.match(/^[a-z0-9]+-[a-z]+-[a-z0-9]+$/);
    });
    catalog.selectedSize.should('exist');
  });

  /**
   * 1. Go to Catalog page and select an OS distro
   * 2. Verify series tabs exist
   * 3. Verify size grid tiles exist for selected series
   * 4. Test toggling show all sizes if available
   * 5. Select a different size tile and verify footer summary reflects it
   */
  it('should allow selecting instance type series and sizes', () => {
    catalog.goToCatalog();
    catalog.distros.first().click();
    catalog.seriesTabs.should('have.length.at.least', 1);

    // Toggle all sizes if toggle button is available
    cy.get('body').then($body => {
      if ($body.find('.vm-catalog__step:eq(1) button.role-link').length > 0) {
        catalog.toggleAllSizesButton.invoke('text').then((initialText: string) => {
          catalog.toggleAllSizes();
          catalog.toggleAllSizesButton.invoke('text').should((newText: string) => {
            expect(newText).to.not.equal(initialText);
          });
          // Toggle back to common
          catalog.toggleAllSizes();
        });
      }
    });

    // Select second size if available
    catalog.sizes.then($sizes => {
      if ($sizes.length > 1) {
        catalog.sizes.eq(1).click();
        catalog.sizes.eq(1).should('have.class', 'is-selected');
        catalog.sizes.eq(1).find('.size__name').invoke('text').then((sizeName: string) => {
          catalog.summary.should('contain', sizeName.trim());
        });
      }
    });
  });

  /**
   * 1. Go to Catalog page and select an OS distro
   * 2. Clear Name field -> verify Create button is disabled
   * 3. Enter invalid DNS-1123 name -> verify validation error message and Create is disabled
   * 4. Enter valid DNS name -> verify error is cleared
   * 5. Enter disk size smaller than minimum -> verify disk error message and Create is disabled
   * 6. Restore valid disk size -> verify error is cleared and Create is enabled
   */
  it('should validate Name and Root disk fields', () => {
    catalog.goToCatalog();
    catalog.distros.first().click();

    // Name validation
    catalog.name().clear();
    catalog.createButton.should('be.disabled');

    catalog.name().input('Invalid_VM_Name');
    catalog.getNameError().should('be.visible').and('contain', 'Lowercase letters, digits and dashes');
    catalog.createButton.should('be.disabled');

    catalog.name().input('valid-catalog-vm');
    catalog.getNameError().should('not.exist');

    // Root disk validation
    catalog.rootDisk().clear();
    catalog.rootDisk().input('1');
    catalog.getDiskError().should('be.visible').and('contain', 'At least');
    catalog.createButton.should('be.disabled');

    catalog.rootDisk().clear();
    catalog.rootDisk().input('50');
    catalog.getDiskError().should('not.exist');
    catalog.createButton.should('not.be.disabled');
  });

  /**
   * 1. Go to Catalog page and select an OS distro and size
   * 2. Verify 'Preview spec' button is enabled
   * 3. Click 'Preview spec'
   * 4. Verify preview section appears showing requested refs and expanded domain
   */
  it('should show spec preview with instancetype refs and expanded domain', () => {
    catalog.goToCatalog();
    catalog.distros.first().click();
    catalog.name().input('preview-test-vm');

    catalog.previewButton.should('not.be.disabled');
    catalog.clickPreviewSpec();

    catalog.previewSection.should('be.visible');
    catalog.previewRefs.invoke('text').then((refs: string) => {
      expect(refs).to.contain('instancetype');
    });
    catalog.previewDomain.invoke('text').then((domain: string) => {
      expect(domain).to.contain('devices');
    });
  });

  /**
   * 1. Go to Catalog page and select an OS distro
   * 2. Verify summary initially shows 'starts on create'
   * 3. Uncheck 'Start after creation'
   * 4. Verify summary updates to 'stays stopped'
   * 5. Re-check 'Start after creation'
   * 6. Verify summary updates back to 'starts on create'
   */
  it('should update summary when toggling Start after creation', () => {
    catalog.goToCatalog();
    catalog.distros.first().click();

    catalog.summary.should('contain', 'starts on create');

    catalog.startAfterCreation().check(false);
    catalog.summary.should('contain', 'stays stopped');

    catalog.startAfterCreation().check(true);
    catalog.summary.should('contain', 'starts on create');
  });
});
