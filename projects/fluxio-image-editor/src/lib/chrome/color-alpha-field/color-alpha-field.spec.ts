import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { ColorAlphaFieldComponent } from './color-alpha-field';
import { EditorPresentationStore } from '../../editor-shell/editor-presentation.store';
import { ColorPickerTool } from '../../editor-shell/tools/color-picker.tool';

describe('ColorAlphaFieldComponent', () => {
  let fixture: ComponentFixture<ColorAlphaFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColorAlphaFieldComponent],
      providers: [
        {
          provide: ColorPickerTool,
          useValue: {
            isActive: () => false,
            startSample: () => undefined,
            cancel: () => undefined,
            applySampleToField: (_current: string, sample: { r: number; g: number; b: number }) =>
              `#${[sample.r, sample.g, sample.b].map((n) => n.toString(16).padStart(2, '0')).join('')}`,
          },
        },
        {
          provide: EditorPresentationStore,
          useValue: {
            colorPickerAvailable: signal(false),
            colorPickerMode: signal(false),
            recentColors: signal<readonly string[]>([]),
            recentColorTargetKey: signal<string | null>(null),
            rememberColor: () => undefined,
            registerRecentColorTarget: () => undefined,
            applyRecentColor: () => false,
            t: (key: string) => key,
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ColorAlphaFieldComponent);
    fixture.componentRef.setInput('label', 'Fill');
    fixture.componentRef.setInput('opacityLabel', 'Opacity');
    fixture.componentRef.setInput('value', '#ff0000');
    fixture.detectChanges();
  });

  it('shows a native color picker beside an editable hex value', () => {
    const picker = fixture.nativeElement.querySelector('input[type="color"]');
    const hex = fixture.nativeElement.querySelector('.fluxio-color-alpha__hex') as HTMLInputElement;
    expect(picker).toBeTruthy();
    expect(hex?.value.toLowerCase()).toBe('#ff0000');
  });

  it('emits live and commit updates from opacity changes', () => {
    const changeSpy = vi.fn();
    const commitSpy = vi.fn();
    fixture.componentInstance.valueChange.subscribe(changeSpy);
    fixture.componentInstance.valueCommit.subscribe(commitSpy);

    const slider = fixture.nativeElement.querySelector('input[type="range"]') as HTMLInputElement;
    slider.value = '50';
    slider.dispatchEvent(new Event('input'));
    slider.dispatchEvent(new Event('change'));

    expect(changeSpy).toHaveBeenCalled();
    expect(commitSpy).toHaveBeenCalled();
    expect(String(commitSpy.mock.calls.at(-1)?.[0])).toMatch(/rgba?\(/);
  });

  it('hides opacity controls when showOpacity is false', () => {
    fixture.componentRef.setInput('showOpacity', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[type="range"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.fluxio-color-alpha__opacity')).toBeNull();
  });

  it('commits typed hex on blur', () => {
    const commitSpy = vi.fn();
    fixture.componentInstance.valueCommit.subscribe(commitSpy);
    const hex = fixture.nativeElement.querySelector('.fluxio-color-alpha__hex') as HTMLInputElement;
    hex.dispatchEvent(new Event('focus'));
    hex.value = '00ff00';
    hex.dispatchEvent(new Event('input'));
    hex.dispatchEvent(new Event('blur'));
    expect(commitSpy).toHaveBeenCalled();
    expect(String(commitSpy.mock.calls.at(-1)?.[0]).toLowerCase()).toContain('00ff00');
  });

  it('applies a recent color swatch on click', () => {
    const presentation = TestBed.inject(EditorPresentationStore) as unknown as {
      recentColors: ReturnType<typeof signal<readonly string[]>>;
      rememberColor: ReturnType<typeof vi.fn>;
      applyRecentColor: ReturnType<typeof vi.fn>;
    };
    presentation.recentColors.set(['#00aaff']);
    presentation.rememberColor = vi.fn();
    presentation.applyRecentColor = vi.fn(() => false);
    fixture.detectChanges();

    const commitSpy = vi.fn();
    fixture.componentInstance.valueCommit.subscribe(commitSpy);
    const swatch = fixture.nativeElement.querySelector(
      '.fluxio-color-alpha__recent-swatch',
    ) as HTMLButtonElement;
    expect(swatch).toBeTruthy();
    swatch.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    expect(commitSpy).toHaveBeenCalledWith('#00aaff');
  });
});
