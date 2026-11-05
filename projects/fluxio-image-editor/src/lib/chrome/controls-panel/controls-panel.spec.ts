import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { ControlsPanelComponent } from './controls-panel';

describe('ControlsPanelComponent', () => {
  let fixture: ComponentFixture<ControlsPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlsPanelComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ControlsPanelComponent);
    fixture.componentRef.setInput('ariaLabel', 'Tool controls');
    fixture.componentRef.setInput('position', 'left');
  });

  it('hides content when closed', () => {
    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.hasAttribute('hidden')).toBe(true);
    expect(fixture.nativeElement.querySelector('.fluxio-controls-panel')).toBeNull();
  });

  it('renders a left or right side panel when open', () => {
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('position', 'right');
    fixture.componentRef.setInput('activeTool', 'text');
    fixture.detectChanges();

    expect(fixture.nativeElement.classList.contains('fluxio-controls-panel-host--open')).toBe(true);
    expect(fixture.nativeElement.getAttribute('data-pos')).toBe('right');
    const panel = fixture.nativeElement.querySelector('.fluxio-controls-panel');
    expect(panel).toBeTruthy();
    expect(panel.getAttribute('data-tool')).toBe('text');
    expect(panel.getAttribute('data-pos')).toBe('right');
  });
});
