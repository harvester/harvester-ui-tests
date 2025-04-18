import sshPage from "@/pageobjects/sshKey.po";
import {sshKey as sshKeyExample} from '@/fixtures/ssh-key.js'
import {generateName} from '@/utils/utils';

const ssh = new sshPage();

describe('SSH Keys Page', () => {
  beforeEach(() => {
    cy.login();
  });

  /**
   * 1. Login
   * 2. Navigate to the ssh create page
   * 3. Click Create button
   * Expected Results
   * 1. Create ssh successfully
  */
  it('Create a SSH key successfully', () => {
    const name = generateName('test-ssh-create');
    const namespace = 'default'

    ssh.create({
      name,
      namespace,
      sshKey: sshKeyExample,
    })

    const cloneName = generateName('test-ssh-clone');
    ssh.clone(`${namespace}/${ name }`, {
      name: cloneName,
      namespace,
    })
    
    ssh.delete(namespace, name)
    ssh.delete(namespace, cloneName)
  });
});