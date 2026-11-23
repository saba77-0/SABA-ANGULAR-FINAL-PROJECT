export interface Station {
  id: number;
  name: string;
}

export interface Train {
  id: number;
  name: string;
  fromStation: string;
  toStation: string;
  departureTime: string;
  price: number;
}

export interface TrainSearch {
  fromStation: string;
  toStation: string;
}

export interface PageQuery {
  take?: number;
  page?: number;
}

export interface ScheduleQuery extends PageQuery {
  trainId?: number;
}

export interface ScheduleFilterQuery extends PageQuery {
  originStationId?: number;
  destinationStationId?: number;
}

export interface TrainFilterQuery extends PageQuery {
  origin?: string;
  destination?: string;
}

export interface CoachFilterQuery extends PageQuery {
  trainId?: number;
  class?: number;
}

export interface TrainCoach {
  id: number;
  number: number;
  class: string;
  price: number;
  trainId: number;
  seatCount: number;
}

export interface TrainSummary {
  id: number;
  number: number;
  name: string;
  thumbnail: string;
  coachesCount: number;
  totalSeats: number;
}

export interface TrainDetails extends TrainSummary {
  schedules: TrainSchedule[];
  coaches: TrainCoach[];
}

export interface TrainSchedule {
  id: number;
  origin: string;
  destination: string;
  departureTime: string;
  trainId: number;
  trainName: string;
  trainNumber: number;
}

export interface ScheduleDetails extends TrainSchedule {
  trainThumbnail?: string | null;
  totalBookings?: number;
}
