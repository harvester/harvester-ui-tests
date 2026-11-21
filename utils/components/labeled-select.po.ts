import ComponentPo from './component.po';

interface SelectArg {
  option: string | undefined,
  index?: number,
  selector?: string,
}
export default class LabeledSelectPo extends ComponentPo {
  select(args: SelectArg):any {
    if (args.option) {
      if (args.index !== undefined) {
        this.self().eq(args.index).click()
      } else {
        this.self().click()
      }
      
      // Always scope the option lookup to the open dropdown list. A page-wide cy.contains() can match
      // other elements first (e.g. the namespace filter chip in the header or a description text)
      cy.get(args.selector || '.vs__dropdown-menu').contains(args.option).click()
    }

    return
  }

  text() {
    return this.self().find('.vs__selected').invoke('text')
  }

  search(string: string | undefined) {
    if (string) {
      this.self().find('.vs__search').clear({force: true})
      this.self().find('.vs__search').type(string)
    }

    return
  }
}
