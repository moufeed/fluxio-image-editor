import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { ImmediateToolActionsComponent } from './immediate-tool-actions';
import { ObjectInspectorActionsComponent } from './object-inspector-actions';
import { PreviewToolActionsComponent } from './preview-tool-actions';

describe('Tool action footers', () => {
  describe('PreviewToolActionsComponent', () => {
    let fixture: ComponentFixture<PreviewToolActionsComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [PreviewToolActionsComponent],
      }).compileComponents();
      fixture = TestBed.createComponent(PreviewToolActionsComponent);
      fixture.componentRef.setInput('cancelLabel', 'Cancel');
      fixture.componentRef.setInput('applyLabel', 'Apply');
      fixture.componentRef.setInput('resetLabel', 'Reset');
      fixture.detectChanges();
    });

    it('renders Apply as Done and Reset/Cancel as cancel actions', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button');
      expect(buttons).toHaveLength(3);
      expect(buttons[0].textContent.trim()).toBe('Reset');
      expect(buttons[0].classList.contains('fluxio-btn--cancel')).toBe(true);
      expect(buttons[1].textContent.trim()).toBe('Cancel');
      expect(buttons[1].classList.contains('fluxio-btn--cancel')).toBe(true);
      expect(buttons[2].textContent.trim()).toBe('Apply');
      expect(buttons[2].classList.contains('fluxio-btn--done')).toBe(true);
    });

    it('can hide Reset and emits apply/cancel', () => {
      const applySpy = vi.fn();
      const cancelSpy = vi.fn();
      fixture.componentRef.setInput('showReset', false);
      fixture.componentInstance.apply.subscribe(applySpy);
      fixture.componentInstance.cancel.subscribe(cancelSpy);
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');
      expect(buttons).toHaveLength(2);
      buttons[0].click();
      buttons[1].click();
      expect(cancelSpy).toHaveBeenCalledOnce();
      expect(applySpy).toHaveBeenCalledOnce();
    });

    it('exposes controls-actions host class for layout', () => {
      expect(
        fixture.nativeElement.classList.contains('fluxio-image-editor__controls-actions'),
      ).toBe(true);
    });
  });

  describe('ImmediateToolActionsComponent', () => {
    it('renders a single Done action', async () => {
      await TestBed.configureTestingModule({
        imports: [ImmediateToolActionsComponent],
      }).compileComponents();
      const fixture = TestBed.createComponent(ImmediateToolActionsComponent);
      fixture.componentRef.setInput('doneLabel', 'Done');
      const doneSpy = vi.fn();
      fixture.componentInstance.done.subscribe(doneSpy);
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');
      expect(buttons).toHaveLength(1);
      expect(buttons[0].classList.contains('fluxio-btn--done')).toBe(true);
      buttons[0].click();
      expect(doneSpy).toHaveBeenCalledOnce();
    });
  });

  describe('ObjectInspectorActionsComponent', () => {
    it('hides Delete by default override and keeps one Done action', async () => {
      await TestBed.configureTestingModule({
        imports: [ObjectInspectorActionsComponent],
      }).compileComponents();
      const fixture = TestBed.createComponent(ObjectInspectorActionsComponent);
      fixture.componentRef.setInput('doneLabel', 'Done');
      fixture.componentRef.setInput('showDelete', false);
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');
      expect(buttons).toHaveLength(1);
      expect(buttons[0].textContent.trim()).toBe('Done');
      expect(buttons[0].classList.contains('fluxio-btn--done')).toBe(true);
    });

    it('supports Clear secondary without competing Done styling', async () => {
      await TestBed.configureTestingModule({
        imports: [ObjectInspectorActionsComponent],
      }).compileComponents();
      const fixture = TestBed.createComponent(ObjectInspectorActionsComponent);
      fixture.componentRef.setInput('doneLabel', 'Done');
      fixture.componentRef.setInput('showDelete', false);
      fixture.componentRef.setInput('showSecondary', true);
      fixture.componentRef.setInput('secondaryLabel', 'Clear');
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');
      expect(buttons).toHaveLength(2);
      expect(buttons[0].classList.contains('fluxio-btn--clear')).toBe(true);
      expect(buttons[1].classList.contains('fluxio-btn--done')).toBe(true);
    });
  });
});
