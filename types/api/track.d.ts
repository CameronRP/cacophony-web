import { Seconds, TrackId } from "./common";
import {
  ApiAutomaticTrackTagResponse,
  ApiHumanTrackTagResponse,
} from "./trackTag";

export interface ApiTrackResponse {
  id: TrackId;
  start: Seconds;
  end: Seconds;
  tags: (ApiHumanTrackTagResponse | ApiAutomaticTrackTagResponse)[];
}

export interface ApiTrackDataRequest {
  // FIXME - make this consistent once we know who calls this
  start_s: Seconds;
  end_s: Seconds;
  label: string;
  clarity: number;
  positions: any;
  message: string;
  tag: string;
  tracker_version: number;
}