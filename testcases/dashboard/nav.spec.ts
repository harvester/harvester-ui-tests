import { Navbar } from '@/utils/components/page.po';
import { MenuNav } from "@/constants/constants";

const navBar = new Navbar();

describe("Harvester UI Pages URL", () => {
  beforeEach(() => {
    cy.login()
  })

  // https://harvester.github.io/tests/manual/ui/verify-url/
  it("Verify all Harvester UI pages", () => {
    Object.values(MenuNav).forEach((nav) => {
      // @ts-ignore
      navBar.clickMenuNav(...nav);
    })
  })

  // https://harvester.github.io/tests/manual/ui/verify-url/
  it("Verify the Harvester icon on the left top corner", () => {
    cy.get('.dashboard-content header .menu-spacer').find('img').then(($el) => {
      const src = $el.attr('src');
      expect(src).to.match(/harvester.*\.svg/);
    })
  })
})
