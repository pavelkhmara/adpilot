"use client";
import * as React from "react";

type SingleOrMultiple = "single" | "multiple";

export function Accordion({
  type = "single",
  collapsible = false,
  className = "",
  children,
}: {
  type?: SingleOrMultiple;
  collapsible?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`divide-y ${className}`}>{children}</div>;
}

export function AccordionItem({
  value, 
  className = "",
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={className}>{children}</div>;
}

export function AccordionTrigger({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <summary
      className={`cursor-pointer list-none py-4 font-medium flex items-center justify-between`}
      onClick={(e) => e.preventDefault()}
    >
      {children}
    </summary>
  );
}

export function AccordionContent({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`pb-4 text-slate-700 ${className}`}>{children}</div>;
}

/**
 * Простая реализация на <details>:
 * Используйте так:
 *
 * <details open>
 *   <AccordionTrigger>Заголовок</AccordionTrigger>
 *   <AccordionContent>Контент</AccordionContent>
 * </details>
 *
 * Для единообразия можно обернуть в AccordionItem:
 * <AccordionItem value="x"><details>...</details></AccordionItem>
 */
