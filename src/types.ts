/** What an entry on the day's timeline is. */
export type Kind =
  | 'event'    // a time with a note — doors open, free time
  | 'place'    // somewhere booked or somewhere to go
  | 'travel'   // getting from A to B
  | 'divider'  // a big heading that splits the day

export type Mode = 'walk' | 'tube' | 'train' | 'bus' | 'boat' | 'taxi' | 'flight'

export interface Place {
  name: string
  address?: string
  lat?: number
  lng?: number
  placeId?: string
}

export interface Item {
  id: string
  kind: Kind
  time?: string      // "HH:MM"
  end?: string       // "HH:MM"
  title: string
  note?: string
  place?: Place      // place: where; travel: destination
  from?: string      // travel only
  mode?: Mode        // travel only
  booked?: boolean   // place only
  remind?: number    // minutes before `time`; missing = no reminder
}

/** A place saved for the day without a slot on the timeline. */
export interface Spot {
  id: string
  name: string
  note?: string
  place?: Place
}

export interface Day {
  id: string
  date: string       // "YYYY-MM-DD"
  title?: string
  tz?: string        // overrides the trip's time zone for this day
  items: Item[]
  spots: Spot[]
}

export interface Trip {
  name: string
  tz: string
  days: Day[]
}

export const emptyTrip = (): Trip => ({ name: '', tz: 'Europe/London', days: [] })
