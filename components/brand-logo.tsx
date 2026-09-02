import Image from 'next/image';
import { cn } from '@/lib/utils';

export function BrandLogo({
  className,
  onDark = true,
  size = 36,
}: {
  className?: string;
  onDark?: boolean;
  size?: number;
}) {
  return (
    <Image
      className={cn('brand-logo', className)}
      src={onDark ? '/notificator-logo-on-dark.png' : '/notificator-logo.png'}
      alt=""
      width={size}
      height={size}
      aria-hidden="true"
    />
  );
}
