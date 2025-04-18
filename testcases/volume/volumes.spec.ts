import { Constants } from "@/constants/constants";
import { HCI } from '@/constants/types';
import { generateName } from '@/utils/utils';
import { VmsPage } from "@/pageobjects/virtualmachine.po";
import { ImagePage } from "@/pageobjects/image.po";
import { VolumePage } from "@/pageobjects/volume.po";

const constants = new Constants();
const vms = new VmsPage();
const image = new ImagePage();
const volumes = new VolumePage();

describe("Volume Page", () => {
  beforeEach(() => {
    cy.login();
  });

  /**
  * 1. Create new VM
  * 2. Export volume to image from volumes page
  * 3. Create new VM from image
  * Expected Results
  * 1. Image should upload/complete in images page
  * 2. New VM should create
  */
  it("Export image from a volume", () => {
    const IMAGE_NAME = generateName("volume-export-image");
    const VM_NAME = generateName("volume-export-vm");
    const ANOTHER_VM_NAME = generateName("volume-export-vm-2");

    // create VM
    const imageEnv = Cypress.env("image");
    const namespace = 'default';

    const volumes = [{
      buttonText: 'Add Volume',
      create: false,
      image: `default/${imageEnv.name}`,
    }];

    vms.init();
    vms.goToCreate();
    vms.setNameNsDescription(VM_NAME, namespace);
    vms.setBasics('1', '1');
    vms.setVolumes(volumes);
    vms.save();

    // check VM state
    vms.checkState({ name: VM_NAME });

    // // export IMAGE
    image.exportImage(VM_NAME, IMAGE_NAME, namespace);

    // check IMAGE state
    image.goToList();
    image.censorInColumn(IMAGE_NAME, 3, namespace, 4, 'Active', 2, { timeout: constants.timeout.uploadTimeout })
    image.censorInColumn(IMAGE_NAME, 3, namespace, 4, 'Completed', 6);
    image.censorInColumn(IMAGE_NAME, 3, namespace, 4, '10 Gi', 7);

    // create VM
    vms.goToCreate();
    vms.setNameNsDescription(ANOTHER_VM_NAME, namespace);
    vms.setBasics('1', '1');
    vms.setVolumes(volumes);
    vms.save();

    // check VM state
    vms.checkState({ name: ANOTHER_VM_NAME });

    // delete VM
    vms.delete(namespace, ANOTHER_VM_NAME);

    // delete VM
    vms.delete(namespace, VM_NAME);

    // delete IMAGE
    cy.window().then(async (win) => {
      const imageList = (win as any).$nuxt.$store.getters['harvester/all'](HCI.IMAGE);
      const imageObj = imageList.find((I: any) => I.spec.displayName === IMAGE_NAME);
      const realName = imageObj?.metadata?.name;

      image.delete(namespace, realName, IMAGE_NAME);
    })
  });

  /**
   * 1. Navigate to volumes page
   * 2. Click Create
   * 3. Select an image
   * 4. Input a size
   * 5. Click Create
   * Expected Results
   * 1. Page should load
   * 2. Volume should create successfully and go to succeeded in the list
   */
  it("Create volume root disk VM image form", () => {
    const VOLUME_NAME = generateName("volume-e2e-1");

    const imageEnv = Cypress.env("image");
    const namespace = 'default';

    // create VOLUME
    volumes.goToCreate();
    volumes.setNameNsDescription(VOLUME_NAME, namespace);
    volumes.setBasics({ source: 'Virtual Machine Image', image: imageEnv.name, size: '10' });
    volumes.save();

    // check state
    volumes.censorInColumn(VOLUME_NAME, 3, namespace, 4, 'Ready');
    volumes.censorInColumn(VOLUME_NAME, 3, namespace, 4, '10 Gi', 5);

    // delete VOLUME
    volumes.delete(namespace, VOLUME_NAME);
  });

  /**
    * 1. Create a VM with a root volume
    * 2. Delete the VM but not the volume
    * 3. Verify Volume still exists
    * 4. Delete the volume
    * Expected Results
    * 1. VM should create
    * 2. VM should delete
    * 3. Volume should still show in Volume list
    * 4. Volume should delete
  */
  it("Delete volume that was attached to VM but now is not", () => {
    const VM_NAME = generateName("vm-e2e-1");

    const imageEnv = Cypress.env("image");
    const namespace = 'default';
    const volumesInVM = [{
      buttonText: 'Add Volume',
      create: false,
      image: `default/${imageEnv.name}`,
    }];

    // create VM
    cy.intercept('POST', `v1/harvester/${HCI.VM}s/default`).as('create');
    vms.goToCreate();
    vms.setNameNsDescription(VM_NAME, namespace);
    vms.setBasics('1', '1');
    vms.setVolumes(volumesInVM);
    vms.save();

    // get volume name
    cy.wait('@create').should((res: any) => {
      expect(res.response?.statusCode, 'Create VM').to.equal(201);
      const vm = res?.response?.body || {}
      const volumeName = vm.spec?.template?.spec?.volumes?.[0]?.persistentVolumeClaim?.claimName || '';

      // check VM state
      vms.checkState({ name: VM_NAME });

      // delete VM
      vms.delete(namespace, VM_NAME, VM_NAME, { removeRootDisk: false });

      // check VOLUME state
      volumes.goToList()
      volumes.censorInColumn(volumeName, 3, namespace, 4, 'Ready', 2);

      // delete VOLUME
      volumes.delete(namespace, volumeName);
    })
  });

/**
  * 1. Create a virtual machine
  * 2. Create several volumes (without image)
  * 3. Add volume, hot-plug volume to virtual machine
  * 4. Open virtual machine, find hot-plugged volume
  * 5. Click de-attach volume
  * Expected Results
  * 1. Can hot-plug volume without error
  * 2. Can hot-unplug the pluggable volumes without restarting VM
  * 3. The de-attached volume can also be hot-plug and mount back to VM
  */
  const VM_NAME = generateName("vm-e2e-1");
  const VOLUME_NAME_1 = generateName("hotplug-e2e-1");
  const VOLUME_NAME_2 = generateName("hotplug-e2e-2");

  it("Support volume hot plug and unplug from VM", () => {
    cy.login();

    const imageEnv = Cypress.env("image");
    const namespace = 'default';
    const volumesInVM = [{
      buttonText: 'Add Volume',
      create: false,
      image: `default/${imageEnv.name}`,
    }];

    // create VOLUME
    volumes.goToCreate();
    volumes.setNameNsDescription(VOLUME_NAME_1, namespace);
    volumes.setBasics({ size: '4' });
    volumes.save();
    volumes.censorInColumn(VOLUME_NAME_1, 3, namespace, 4, 'Ready');

    volumes.goToCreate();
    volumes.setNameNsDescription(VOLUME_NAME_2, namespace);
    volumes.setBasics({ size: '4' });
    volumes.save();
    volumes.censorInColumn(VOLUME_NAME_2, 3, namespace, 4, 'Ready');

    // create VM
    vms.goToCreate();
    vms.setNameNsDescription(VM_NAME, namespace);
    vms.setBasics('1', '1');
    vms.setVolumes(volumesInVM);
    vms.save();

    // check VM state
    vms.checkState({ name: VM_NAME });

    // hot plug / unplug volume
    vms.plugVolume(VM_NAME, [VOLUME_NAME_1, VOLUME_NAME_2], namespace);
    vms.unplugVolume(VM_NAME, [1, 2], namespace);
    vms.plugVolume(VM_NAME, [VOLUME_NAME_1, VOLUME_NAME_2], namespace);

    // delete VM
    vms.delete(namespace, VM_NAME);

    // delete VOLUME
    volumes.delete(namespace, VOLUME_NAME_1);
    volumes.delete(namespace, VOLUME_NAME_2);
  });

  /**
  * 1. Stop the vm
  * 2. Navigate to volumes page
  * 3. Edit Volume via form
  * 4. Increase size
  * 5. Click Save
  * Expected Results
  * 1. Disk should be resized
  */
  it("Disk should be resized via form", () => {
    const VM_NAME = generateName("vm-e2e-1");

    const imageEnv = Cypress.env("image");
    const namespace = 'default';
    const volumesInVM = [{
      buttonText: 'Add Volume',
      create: false,
      image: `default/${imageEnv.name}`,
      size: '10'
    }];

    // create VM
    cy.intercept('POST', `v1/harvester/${HCI.VM}s/default`).as('create');
    vms.goToCreate();
    vms.setNameNsDescription(VM_NAME, namespace);
    vms.setBasics('1', '1');
    vms.setVolumes(volumesInVM);
    vms.save();

    // get volume name
    cy.wait('@create').should((res: any) => {
      expect(res.response?.statusCode, 'Create VM').to.equal(201);
      const vm = res?.response?.body || {}
      const rootVolumeName = vm.spec?.template?.spec?.volumes?.[0]?.persistentVolumeClaim?.claimName || '';

      // check VM state to Off
      vms.clickAction(VM_NAME, 'Stop');
      vms.searchClear();
      vms.checkState({ name: VM_NAME, state: 'Off' });

      // edit volume to 15Gi
      volumes.goToEdit(rootVolumeName);
      volumes.setBasics({ size: '15' });
      volumes.update(`${namespace}/${rootVolumeName}`);

      // check VOLUME size change to 15 Gi
      volumes.censorInColumn(rootVolumeName, 3, namespace, 4, '15 Gi', 5);

      // delete VM
      vms.delete(namespace, VM_NAME);
    })
  });
});
