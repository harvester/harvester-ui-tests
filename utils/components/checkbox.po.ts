import ComponentPo from '@/utils/components/component.po';

export default class CheckboxPo extends ComponentPo {
  check(newValue: boolean | undefined) {
    if (typeof newValue === 'undefined') {
      return
    }

    this.self().find('[role="checkbox"]').invoke('attr', 'aria-checked').then(isChecked => {
      if ((newValue && isChecked === 'false') || (!newValue && isChecked === 'true')) {
        this.self().click({ force: true })
      }
    })

    return
  }

  value() {
    return Boolean(this.self().find('[role="checkbox"]').invoke('attr', 'aria-checked'))
  }
  
  expectChecked() {
    return this.self().find('[role="checkbox"]').invoke('attr', 'aria-checked').should('eq', 'true')
  }

  expectUnchecked() {
    return this.self().find('[role="checkbox"]').invoke('attr', 'aria-checked').should('eq', undefined)
  }
}
