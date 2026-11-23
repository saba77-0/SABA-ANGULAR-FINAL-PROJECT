import { ScheduleDetails, TrainCoach } from '../trains/train.model';

export interface Seat {
  id: number;
  number: string;
  coachId: number;
}

export interface SeatAvailability extends Seat {
  isAvailable: boolean;
}

export interface CreateBookingRequest {
  scheduleId: number;
  seatId: number[];
  travelDate: string;
}

export interface BookingRecord {
  id: number;
  scheduleId?: number;
  travelDate: string;
  bookedOn?: string | null;
  totalPrice?: number | null;
  schedule?: ScheduleDetails | null;
  coach?: TrainCoach | null;
  seats?: Seat[] | null;
  seatNumbers?: string[] | null;
  origin?: string | null;
  destination?: string | null;
  departureTime?: string | null;
  trainName?: string | null;
  trainNumber?: number | null;
  trainThumbnail?: string | null;
  coachNumber?: number | null;
  coachClass?: string | null;
  price?: number | null;
}
