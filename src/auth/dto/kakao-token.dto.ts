import { IsString, IsNotEmpty, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class KakaoTokenDto {
  @ApiProperty({
    description: '카카오 인증 서버로부터 받은 인가 코드 (Authorization Code)',
    example: 'your_authorization_code_here',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: '인가 코드를 받을 때 사용했던 리다이렉트 URI',
    example: 'http://localhost:8000',
  })
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  redirectUri: string;
}
