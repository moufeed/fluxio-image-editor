import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { UtilibarComponent, type UtilibarItem } from './utilibar';

describe('UtilibarComponent', () => {
  let fixture: ComponentFixture<UtilibarComponent>;

  const actions: readonly UtilibarItem[] = [
    {
      kind: 'action',
      id: 'crop.tool',
      label: 'Crop',
      iconPath: 'M3 3h18v18H3z',
      showIcon: true,
      showLabel: true,
      active: true,
    },
    {
      kind: 'group',
      id: 'annotations',
      label: 'Annotate',
      iconPath: null,
      showIcon: false,
      showLabel: true,
      active: false,
      expanded: true,
      children: [
        {
          id: 'shapes.tool',
          label: 'Shapes',
          iconPath: null,
          showIcon: false,
          showLabel: true,
          active: false,
        },
      ],
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UtilibarComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(UtilibarComponent);
    fixture.componentRef.setInput('ariaLabel', 'Image editor utilities');
    fixture.componentRef.setInput('toolsAriaLabel', 'Editing utilities');
    fixture.componentRef.setInput('actions', actions);
    fixture.componentRef.setInput('position', 'left');
  });

  it('renders tool actions with active pressed state', () => {
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.fluxio-utilibar__btn');
    // crop + group (main) + child (sub-rail)
    expect(buttons.length).toBe(3);
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[0].classList.contains('fluxio-utilibar__btn--active')).toBe(true);
  });

  it('renders expanded group children in a sub-rail beside the main rail', () => {
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.getAttribute('data-subrail')).toBe('true');
    const subrail = host.querySelector('.fluxio-utilibar__subrail');
    expect(subrail).not.toBeNull();
    expect(subrail!.querySelectorAll('.fluxio-utilibar__btn--child').length).toBe(1);
    expect(host.querySelector('.fluxio-utilibar__subgroup')).toBeNull();
  });

  it('emits actionSelect when a sub-rail tool is clicked', () => {
    fixture.detectChanges();
    const emissions: string[] = [];
    fixture.componentInstance.actionSelect.subscribe((id) => emissions.push(id));
    fixture.nativeElement.querySelectorAll('.fluxio-utilibar__btn--child')[0].click();
    expect(emissions).toEqual(['shapes.tool']);
  });

  it('emits group id when the group button is clicked', () => {
    fixture.detectChanges();
    const emissions: string[] = [];
    fixture.componentInstance.actionSelect.subscribe((id) => emissions.push(id));
    fixture.nativeElement.querySelectorAll('.fluxio-utilibar__btn--group')[0].click();
    expect(emissions).toEqual(['annotations']);
  });

  it('hides the sub-rail when no group is expanded', () => {
    fixture.componentRef.setInput('actions', [actions[0], { ...actions[1], expanded: false }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.fluxio-utilibar__subrail')).toBeNull();
    expect(fixture.nativeElement.getAttribute('data-subrail')).toBeNull();
  });

  it('disables buttons when disabled input is true', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.fluxio-utilibar__btn');
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[1].disabled).toBe(true);
  });

  it('sets data-pos on the host for side rail styling', () => {
    fixture.componentRef.setInput('position', 'right');
    fixture.detectChanges();
    expect(fixture.nativeElement.getAttribute('data-pos')).toBe('right');
  });
});
