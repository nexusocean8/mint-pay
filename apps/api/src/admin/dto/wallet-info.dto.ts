import { ApiProperty } from '@nestjs/swagger';

export class WalletInfoResponseDto {
  @ApiProperty({ example: '5A1...' })
  primaryAddress!: string;

  @ApiProperty({
    example: 'a1b2c3...64hex',
    description: 'Private view key (read-only; cannot spend funds)',
  })
  viewKey!: string;

  @ApiProperty({ example: 1234567 })
  restoreHeight!: number;

  @ApiProperty({ example: 1234890 })
  walletHeight!: number;

  @ApiProperty({ example: 1234892 })
  daemonHeight!: number;

  @ApiProperty({ example: true })
  synced!: boolean;
}
