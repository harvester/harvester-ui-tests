import { rancherPage } from "@/pageobjects/rancher.po";
import { rke_guest_clusterPage } from "@/pageobjects/rancher_guest_cluster.po";
import { ImagePage } from "@/pageobjects/image.po";
import SettingsPagePo from "@/pageobjects/settings.po";
import NetworkPage from "@/pageobjects/network.po";
import type { CypressChainable } from '@/utils/po.types'
import { Constants } from '../../constants/constants'
import cypress from 'cypress';
import { LoginPage } from "@/pageobjects/login.po";
import { onlyOn } from "@cypress/skip-test";
import VirtualizationDashboard from "~/pageobjects/virtualizationDashboard.po";

const constants = new Constants();
const rancher = new rancherPage();
const rke_guest_cluster = new rke_guest_clusterPage();
const image = new ImagePage();
const settings = new SettingsPagePo();
const network = new NetworkPage();
const virtualizationDashboard = new VirtualizationDashboard();
let rData = {
    name: '',
    harvester_cluster_name: '',
    cloud_credential: '',
    rke1_cluster_name: '',
    rke2_cluster_name: '',
    k3s_cluster_name: '',
    cloud_provider_name: '',
    csi_driver_name: '',
    dhcp_lb_name: '',
    pool_lb_name: '',
    vip_pool_cidr: '',
    vip_pool_namespace: '',
    rke2_cluster_attributes: {
        cpus: '',
        memory: '',
        disk: '',
        namespace: '',
        image: '',
        network_name: '',
        ssh_user: '',
        rke2_latest: '',
        rke2_stable: '',
        k3s_latest: '',
        k3s_stable: '',
        user_data_template: ''
    },
    rke1_cluster_attributes: {
        cpus: '',
        memory: '',
        disk: '',
        namespace: '',
        image: '',
        network_name: '',
        ssh_user: '',
        rke1_latest: '',
        rke1_stable: '',
        user_data_template: ''
    }
};

/**
 * 1. Create image with cloud image available for openSUSE. http://download.opensuse.org/repositories/Cloud:/Images:/Leap_15.3/images/openSUSE-Leap-15.3.x86_64-NoCloud.qcow2
 * 2. Click save
 * 3. Try to edit the description
 * 4. Try to edit the URL
 * 5. Try to edit the Labels
 * Expected Results
 * 1. Image should show state as Active.
 * 2. Image should show progress as Completed.
 * 3. User should be able to edit the description and Labels
 * 4. User should not be able to edit the URL
 * 5. User should be able to create a new image with same name.
 */
describe('Rancher Integration Test', function () {
    let isFirstTimeLogin: boolean = false;
    let addUIextensionRepo: boolean = false;
    let rancherVersion: string;

    const IMAGE_NAME = 'focal-server-cloudimg-amd64.img';
    const IMAGE_URL = 'https://cloud-images.ubuntu.com/focal/current/focal-server-cloudimg-amd64.img';

    const value = {
        name: IMAGE_NAME,
        url: IMAGE_URL,
    }

    before(async () => {
        isFirstTimeLogin = await rancherPage.isFirstTimeLogin();
    })

    it('Rancher First Login', { baseUrl: constants.rancherUrl }, () => {
        onlyOn(isFirstTimeLogin);
        const page = new rancherPage();
        page.firstTimeLogin();
    });

    /**
     * Add Harvester UI Extension Repository in Rancher local cluster for installation
     * 1. Access Rancher local cluster Apps -> Repositories page
     * 2. Create a new repository
     * 3. Select the Git repository target
     * 4. Input the Name, Git Repo URL and Branch
     * 5. Ensure the new repository in Active state
     */
    it('Add Harvester UI Extension Repository', { baseUrl: constants.rancherUrl }, () => {
        rancher.rancherLogin();

        cy.wrap(rancher.getServerVersion()).then((infoBody) => {
            cy.log(`Server Info: ${infoBody}`);
            try {
                const parsedData = JSON.parse(infoBody as string);
                rancherVersion = parsedData.Version;
                cy.log(`Rancher version: ${rancherVersion}`);

                const shouldSkipTest = rancherVersion.startsWith('v2.8') || rancherVersion.startsWith('v2.9');
                onlyOn(!shouldSkipTest);

                // Continue with the rest of the test if not skipped
                rancher.add_local_cluster_repo(
                    "harvester",
                    constants.harvester_ui_extension_repo_url,
                    constants.harvester_ui_extension_branch,
                );
                rancher.visit_local_cluster_repositories();
                rancher.checkState('harvester');
                addUIextensionRepo = true;
            } catch (e) {
                cy.log('Failed to parse server version JSON: ' + (e instanceof Error ? e.message : e));
                throw e; // Fail the test
            }
        });
    });

    /**
     * Install Harvester UI Extension in the Extensions -> available page
     * 1. Visit the Extension -> Available page
     * 2. Get the Harvester extension card and click the Install button
     * 3. Search and select the version from the dropdown menu list
     * 4. Click the Install button to install the Harvester extension
     * 5. Ensure the Harvester extension card exists
     * 6. Ensure the Harvester extension card have the uninstall button
     */
    it('Install Harvester UI Extension', { baseUrl: constants.rancherUrl }, () => {
        onlyOn(addUIextensionRepo);
        rancher.rancherLogin();
        
        if (!rancherVersion) {
            cy.log('Warning: Rancher version not available from previous test');
            // Either fail the test or fetch it again
            cy.wrap(rancher.getServerVersion()).then((infoBody) => {
                const parsedData = JSON.parse(infoBody as string);
                rancherVersion = parsedData.Version;
                cy.log(`Fetched Rancher version: ${rancherVersion}`);
            });
        } else {
            cy.log(`Using Rancher version: ${rancherVersion}`);
        }
        rancher.install_harvester_ui_extension(constants.harvester_ui_extension_version, rancherVersion);

    });

    it('Rancher import Harvester', { baseUrl: constants.rancherUrl }, () => {
        rancher.rancherLogin();

        rancher.importHarvester().then((el) => {
            let copyImportUrl = el.text();
            console.log('Get: ', copyImportUrl)
            cy.log(copyImportUrl);
            cy.task('setGlobalVariable', copyImportUrl)
        }).as('importCluster');

    });
});


describe('Harvester import Rancher', function () {
    beforeEach(() => {
        cy.fixture('rancher').then((data) => {
            rData = data;
        });
    })

    let isHarvFirstTimeLogin: boolean = false;
    before(async () => {
        isHarvFirstTimeLogin = await LoginPage.isFirstTimeLogin();

    })

    it('Harvester import Rancher', () => {
        // cy.login();
        if (isHarvFirstTimeLogin) {
            const page = new LoginPage();
            page.visit()
                .selectSpecificPassword()
                .checkEula(true)
                .inputPassword()
                .submitBtn.click();

            page.validateLogin();
        } else {
            cy.login();
        }
        rancher.registerRancher();
    });

})

describe('Rancher integration', function () {
    beforeEach(() => {
        cy.fixture('rancher').then((data) => {
            rData = data;
        });
    })


    it('Check Harvester Cluster Status', { baseUrl: constants.rancherUrl }, () => {
        // cy.login();
        cy.visit('/');
        cy.wait(constants.timeout.timeout);

        rancher.rancherLogin();

        rancher.visit_virtualizationManagement();

        rancher.checkState(rData.harvester_cluster_name);
    });

    it('Check Rancher Harvester dashboard', { baseUrl: constants.rancherUrl }, () => {
        // cy.login();
        cy.visit('/');
        cy.wait(constants.timeout.timeout);

        rancher.rancherLogin();

        rancher.visit_virtualizationManagement();

        rancher.checkState(rData.harvester_cluster_name);

        rancher.open_virtualizationDashboard();

        virtualizationDashboard.validateClusterName();

    });

})

