import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderActionsComponent } from './order-actions';

describe('OrderActionsComponent', () => {
  let fixture: ComponentFixture<OrderActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderActionsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OrderActionsComponent);
    fixture.componentRef.setInput('ariaLabel', 'Order');
    fixture.componentRef.setInput('bringToFrontLabel', 'Bring to front');
    fixture.componentRef.setInput('bringForwardLabel', 'Bring forward');
    fixture.componentRef.setInput('sendBackwardLabel', 'Send backward');
    fixture.componentRef.setInput('sendToBackLabel', 'Send to back');
    fixture.detectChanges();
  });

  it('emits reorder actions from icon buttons', () => {
    const emitted: string[] = [];
    fixture.componentInstance.reorder.subscribe((action) => emitted.push(action));

    const buttons = fixture.nativeElement.querySelectorAll(
      'button',
    ) as NodeListOf<HTMLButtonElement>;
    expect(buttons.length).toBe(4);

    buttons[0].click();
    buttons[1].click();
    buttons[2].click();
    buttons[3].click();

    expect(emitted).toEqual(['front', 'forward', 'backward', 'back']);
  });

  it('disables individual actions when can* inputs are false', () => {
    fixture.componentRef.setInput('canFront', false);
    fixture.componentRef.setInput('canForward', true);
    fixture.componentRef.setInput('canBackward', false);
    fixture.componentRef.setInput('canBack', true);
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll(
      'button',
    ) as NodeListOf<HTMLButtonElement>;
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[1].disabled).toBe(false);
    expect(buttons[2].disabled).toBe(true);
    expect(buttons[3].disabled).toBe(false);
  });
});
