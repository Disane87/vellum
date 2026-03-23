import { Controller, Get, Query } from '@nestjs/common';
import { BimiService } from './bimi.service';

@Controller('bimi')
export class BimiController {
  constructor(private readonly bimiService: BimiService) {}

  @Get('lookup')
  async lookup(@Query('email') email: string) {
    const logoUrl = await this.bimiService.getLogoUrl(email);
    return { email, logoUrl };
  }
}
