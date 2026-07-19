import { Body, Controller, Param, Patch } from '@nestjs/common';
import { Language } from '@prisma/client';
import { IsEnum } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

class UpdateUserPreferencesDto {
  @IsEnum(Language)
  preferredLanguage: Language;
}

@Controller({ path: 'users', version: '1' })
export class UserPreferencesController {
  constructor(private readonly prisma: PrismaService) {}

  @Patch(':id/preferences')
  update(@Param('id') id: string, @Body() dto: UpdateUserPreferencesDto) {
    return this.prisma.user.update({
      where: { id },
      data: { preferredLanguage: dto.preferredLanguage },
      select: { id: true, name: true, email: true, preferredLanguage: true },
    });
  }
}
