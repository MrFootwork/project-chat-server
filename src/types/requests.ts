import { Request } from 'express';

export interface RequestToken extends Request {
  token?: string;
}
