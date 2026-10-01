'use client';

import { cn } from '@/lib/utils';

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      className={cn('h-8 w-8 shrink-0 shadow-[var(--shadow-brand)]', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="7.5" fill="#18433D" />
      <g transform="scale(0.0625)">
        <path d="M126 287C126 276.4 131.2 266.5 140 260.6L180 233.9C191.9 226 208 234.5 208 248.8V355.2C208 369.5 191.9 378 180 370.1L140 343.4C131.2 337.5 126 327.6 126 317V287Z" fill="#86B6A8" />
        <path d="M218 207C218 196.1 223.6 185.9 232.9 180.2L286.9 147.2C299.2 139.7 315 148.5 315 162.9V395.1C315 409.5 299.2 418.3 286.9 410.8L232.9 377.8C223.6 372.1 218 361.9 218 351V207Z" fill="#F6F4EE" />
        <path d="M326 137C326 121.7 342.7 112.3 355.8 120.2L417.8 157.9C426.6 163.3 432 172.8 432 183.1V306.9C432 317.2 426.6 326.7 417.8 332.1L355.8 369.8C342.7 377.7 326 368.3 326 353V137Z" fill="#EA6857" />
      </g>
    </svg>
  );
}
