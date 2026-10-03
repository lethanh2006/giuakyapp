import { HttpService } from '@nestjs/axios';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { createJwtKey } from '../config/jwt-secret';
import type { RequestWithContext } from '../interfaces/request-context.interface';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { IdentityIntrospectionCache } from './identity-introspection-cache';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt-1gio') {
  private readonly authServiceUrl: string;
  private readonly identityCache: IdentityIntrospectionCache<
    Record<string, unknown>
  >;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const jwtKey = createJwtKey(configService.get<string>('JWT_SECRET'));
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // passport-jwt types omit KeyObject, which jsonwebtoken accepts at runtime.
      secretOrKeyProvider: (_request, _token, done) =>
        done(null, jwtKey as unknown as Buffer),
      algorithms: ['HS256'],
      passReqToCallback: true,
    });
    this.authServiceUrl = this.configService.get<string>(
      'AUTH_SERVICE_URL',
      'http://localhost:4000',
    );
    const cacheTtlMs = Number(
      this.configService.get<string>(
        'GATEWAY_AUTH_INTROSPECTION_CACHE_TTL_MS',
      ) ?? 0,
    );
    this.identityCache = new IdentityIntrospectionCache(cacheTtlMs);
  }

  async validate(request: RequestWithContext) {
    const authorization = request.headers.authorization;
    const requestId = request.requestContext?.requestId;
    if (!authorization) throw new UnauthorizedException('Thiếu access token');

    const started = performance.now();
    try {
      // Passport has already verified this access token's signature and expiry.
      // Store only a digest, and cache successful Auth decisions for a short,
      // bounded TTL to reduce repeated introspection calls during request bursts.
      const cacheKey = createHash('sha256').update(authorization).digest('hex');
      const identity = await this.identityCache.get(cacheKey, async () => {
        const { data } = await this.httpService.axiosRef.post(
          `${this.authServiceUrl}/api/auth/introspect`,
          {},
          {
            headers: {
              Authorization: authorization,
              ...(requestId ? { 'x-request-id': requestId } : {}),
            },
          },
        );
        if (
          !data?.valid ||
          typeof data.user !== 'object' ||
          data.user === null ||
          Array.isArray(data.user)
        ) {
          throw new UnauthorizedException('Token không còn hiệu lực');
        }
        return data.user as Record<string, unknown>;
      });
      return { ...identity };
    } catch {
      throw new UnauthorizedException('Token không còn hiệu lực');
    } finally {
      if (request.requestContext) {
        (request.requestContext.perf ??= {}).authMs =
          performance.now() - started;
      }
    }
  }
}
