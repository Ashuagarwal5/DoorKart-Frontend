import { ORDER_STATUS_LABEL } from '@/constants/status';
import type { OrderStatus } from '@/types/api';
import { cn } from '@/utils/cn';

/** The normal journey of an order, left to right. Cancelled and failed orders leave it. */
const STEPS: OrderStatus[] = ['PLACED', 'CONFIRMED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

/**
 * Shows where an order is on its way to the customer. It only DRAWS the status the server
 * reports; what the admin may do next still comes from the server's allowed transitions.
 */
export function OrderProgress({ status }: { status: OrderStatus }) {
  if (status === 'CANCELLED') {
    return (
      <p role="status" className="rounded-lg bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
        This order was cancelled. Its stock went back on sale.
      </p>
    );
  }

  const isFailed = status === 'DELIVERY_FAILED';
  // A failed delivery sits at the delivery step: the order can be sent out again.
  const current = STEPS.indexOf(isFailed ? 'OUT_FOR_DELIVERY' : status);

  return (
    <div>
      <ol className="flex items-start" aria-label="Order progress">
        {STEPS.map((step, index) => {
          const isDone = index < current || status === 'DELIVERED';
          const isCurrent = index === current && status !== 'DELIVERED';
          const isProblem = isFailed && isCurrent;
          return (
            <li
              key={step}
              aria-current={isCurrent ? 'step' : undefined}
              className="relative flex flex-1 flex-col items-center text-center">
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute right-1/2 top-3.5 h-0.5 w-full -translate-y-1/2',
                    index <= current || status === 'DELIVERED' ? 'bg-primary' : 'bg-line'
                  )}
                />
              ) : null}
              <span
                className={cn(
                  'relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold',
                  isProblem
                    ? 'border-danger bg-danger text-white'
                    : isDone
                      ? 'border-primary bg-primary text-on-primary'
                      : isCurrent
                        ? 'border-primary bg-surface text-primary ring-4 ring-primary-soft'
                        : 'border-line bg-surface text-muted'
                )}>
                {isProblem ? '!' : isDone ? '✓' : index + 1}
              </span>
              <span
                className={cn(
                  'mt-2 px-0.5 text-[11px] leading-tight sm:text-xs',
                  isCurrent || isDone ? 'font-medium text-fg' : 'text-muted'
                )}>
                {ORDER_STATUS_LABEL[step]}
              </span>
            </li>
          );
        })}
      </ol>
      {isFailed ? (
        <p role="status" className="mt-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
          The delivery failed. Send it out again, or cancel the order.
        </p>
      ) : null}
    </div>
  );
}
