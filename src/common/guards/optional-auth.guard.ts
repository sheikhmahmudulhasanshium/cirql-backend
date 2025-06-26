import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * An authentication guard that is optional.
 * It uses the 'jwt' strategy but does not throw an error if the user is not authenticated.
 * If a valid JWT is present, it will attach the user object to the request.
 * If no token is present, or the token is invalid, it allows the request to proceed
 * without a user object. This is ideal for endpoints that provide public data but can

 * offer an enhanced experience for logged-in users.
 */
@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
  // Override the handleRequest method from the default AuthGuard.
  // We use a signature that only accepts the parameters we need.
  // By simply returning the `user` object (which will be undefined if auth fails),
  // we prevent the guard from throwing an error and make authentication optional.
  handleRequest(err: any, user: any): any {
    return user;
  }
}
