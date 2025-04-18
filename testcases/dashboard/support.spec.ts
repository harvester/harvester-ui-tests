import { SupportPage } from "@/pageobjects/support.po";
import { Constants } from "@/constants/constants";
const constants = new Constants;

describe("Support Page", () => {
  const page = new SupportPage();
  before(() => cy.task("deleteFolder", Cypress.config("downloadsFolder")))

  beforeEach(() => {
    page.visit();
  })

  it("Links in community support section should be correct URLs", () => {
    page.docsBtn.invoke("attr", "href")
        .should("eq", "https://docs.harvesterhci.io")

    page.forumsBtn.invoke("attr", "href")
        .should("eq", "https://forums.rancher.com/c/harvester/")

    page.slackBtn.invoke("attr", "href")
        .should("eq", "https://slack.rancher.io")

    page.fileAnIssueBtn.invoke("attr", "href")
        .should("eq", "https://github.com/harvester/harvester/issues/new/choose")
  })

  it("KubeConfig file should be downloaded successfully", () => {
    const kubeconfig = `${Cypress.config("downloadsFolder")}/local.yaml`
    page.downloadKubeConfigBtn.click()
    cy.readFile(kubeconfig)
      .should("exist")

    cy.task("readYaml", kubeconfig)
      .should(val => expect(val).to.not.be.a('string'))
  })

  context('Generate Support Bundle', () => {
    it('Is required to input Description', () => {
      page.generateSupportBundleBtn.click()

      page.inputSupportBundle()
          .get("@generateBtn").click()

      // to verify the button renamed with `Error`
      cy.get("@generateBtn")
        .should("be.not.disabled")
        .should("contain", "Error")

      // to verify the error message displayed
      cy.get("@generateView")
        .get(".banner.error")
        .should("be.visible")

      // to verify the modal disappeared.
      cy.get("@closeBtn").click()
      cy.get("@generateView").should('not.exist')
    })

    it('Should download successfully', () => {
      let filename: string | undefined = undefined
      page.generateSupportBundleBtn.click()

      page.inputSupportBundle('this is a test bundle')
          .get("@generateBtn").click()
          .intercept("/v1/harvester/*supportbundles/**/bundle*", req => 
            req.continue(res => {
              filename = res.body?.metadata?.name
            })
          )
           
 
      cy.window().then(win => {
        const timeout = {timeout: constants.timeout.downloadTimeout}
        cy.log(`Wait for ${timeout.timeout / 1000} seconds to generate and download support bundle`)

        return cy.get("#modals").then(timeout, ($el) => {
          return new Promise((resolve, reject) => {
            const modalObserver = new MutationObserver((mutationList) => {
              if(mutationList.length > 0 && mutationList.every(ml => ml.type === "childList")) {
                cy.log('Wait for 10s to reload the page.')
                // delay 10s to wait for download process done, then refresh page
                setTimeout(() => resolve(win.history.go(0)), 10000)
              }else{
                reject('Error: monitoring generate support modal closed, no childList mutation found');
              }
            });
            modalObserver.observe($el[0], { childList: true });
          })
        })
      })
      .then(() => { // the scope will execute after page reloaded
        new Promise((resolve, reject) => {
          if(filename === undefined) {
            reject('filename is undefined')
          }

          const supportBundle = {path: Cypress.config("downloadsFolder"), fileName: "supportbundle"}  
       
          // resolve real bundle filename
          cy.task("findFiles", supportBundle)
            .then((files: any) => {
              if(files.length === 1){
                cy.log('Found support bundle:', files[0])
                resolve(files[0]) 
              }else{
                reject(`Error: support bundle not found, files=${files}`)
              }
            })
        })
        .then(filename => {
          cy.log("Downloaded SupportBundle: ", filename)
          const zipFileName = `${Cypress.config("downloadsFolder")}/${filename}`
          // resolve file entries in zip
          return new Promise((resolve) => {
            cy.task("readZipFile", zipFileName).then(entries => resolve(entries))
          })
        })
        .then((items: any) => {
          cy.log(`Total file entries in zip : ${items.length}`)

          const {dirs, files} = items.reduce((groups: any, e: any) => {
            e.isDirectory ? groups.dirs.push(e) : groups.files.push(e)
            return groups
          }, {dirs:[], files:[]})

          cy.log("Total Dirs count :", dirs.length)
          cy.log("Total Files count:", files.length)
          expect(dirs.length).to.greaterThan(0)  
          expect(files.length).to.greaterThan(0)  
        }).catch((err) => {
          cy.log('🚀 ~ Download support bundle failed. Err:', err)
        })
      })
    })
  })
})
