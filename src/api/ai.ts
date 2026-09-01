import { post } from './client';
import { ENDPOINTS } from '../constants/api';
import {
  AiHeadlineRequest, AiHeadlineResponse,
  AiExpandRequest, AiExpandResponse
} from '../types';

export const generateHeadline = (data: AiHeadlineRequest): Promise<AiHeadlineResponse> =>
  post<AiHeadlineResponse>(ENDPOINTS.ai.headline, data);

export const expandContent = (data: AiExpandRequest): Promise<AiExpandResponse> =>
  post<AiExpandResponse>(ENDPOINTS.ai.expand, data);
