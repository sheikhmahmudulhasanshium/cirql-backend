// src/upload/upload.controller.ts
import { Controller, All, Req, Res, Next } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { createRouteHandler } from 'uploadthing/express';
import * as jwt from 'jsonwebtoken';
import { ApiExcludeController } from '@nestjs/swagger';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { ourFileRouter } from './upload.router';
import { MediaService } from './media.service';

@ApiExcludeController()
// --- THIS IS THE FIX ---
// Set the controller to listen on the path the proxy will forward to.
// The default path is `/api/uploadthing`.
@Controller('api/uploadthing')
export class UploadController {
  private readonly utRouteHandler = createRouteHandler({
    router: ourFileRouter,
  });

  constructor(private readonly mediaService: MediaService) {}

  @All('/*')
  handleUpload(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res
          .status(401)
          .send({ error: 'Unauthorized: No token provided' });
      }
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET as string,
      ) as JwtPayload;

      if (decoded.isTwoFactorAuthenticationComplete !== true) {
        return res
          .status(401)
          .send({ error: 'Unauthorized: 2FA not completed' });
      }

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      req.uploadthing = {
        userId: decoded.sub,
        mediaService: this.mediaService,
      };

      return this.utRouteHandler(req, res, next);
    } catch {
      return res.status(401).send({ error: 'Unauthorized: Invalid token' });
    }
  }
}
