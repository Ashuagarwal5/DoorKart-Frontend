'use client';

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import type { OrderDetail } from '@/types/api';

/** The phone number as digits only, with India's 91 in front of a 10-digit number, for wa.me links. */
function whatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

function addressText(order: OrderDetail): string {
  const address = order.deliveryAddress;
  return [
    order.customerName,
    order.customerPhone,
    address.addressLine1,
    address.addressLine2,
    address.landmark ? `Landmark: ${address.landmark}` : null,
    `${address.area}, ${address.city} - ${address.pincode}`,
  ]
    .filter(Boolean)
    .join('\n');
}

/** Quick ways to reach the customer and to carry the address to the delivery. Hidden when printing. */
export function CustomerContact({ order }: { order: OrderDetail }) {
  const toast = useToast();

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(addressText(order));
      toast.success('Address copied.');
    } catch {
      toast.error('Could not copy. Select the address and copy it by hand.');
    }
  };

  return (
    <div className="mt-4 flex flex-wrap gap-2 print:hidden">
      <a
        href={`tel:${order.customerPhone}`}
        className="inline-flex min-h-8 items-center rounded-lg border border-line bg-surface px-3 text-xs font-medium text-fg hover:bg-bg">
        Call
      </a>
      <a
        href={`https://wa.me/${whatsAppNumber(order.customerPhone)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-8 items-center rounded-lg border border-line bg-surface px-3 text-xs font-medium text-fg hover:bg-bg">
        WhatsApp
      </a>
      <Button size="sm" onClick={copyAddress}>
        Copy address
      </Button>
    </div>
  );
}
