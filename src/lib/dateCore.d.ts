import type { ISODate } from '../types'

export function parseISO(iso: ISODate): Date
export function toISO(date: Date): ISODate
export function addDays(iso: ISODate, days: number): ISODate
/** getDay(): 0=domingo … 6=sábado. */
export function weekday(iso: ISODate): number
/** Devuelve todas las fechas (inclusive) entre start y end. */
export function eachDay(start: ISODate, end: ISODate): ISODate[]
