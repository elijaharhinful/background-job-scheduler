import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { DlqService } from './dlq.service';
import { DlqDocs } from './docs/dlq.docs';
import { DlqQueryDto } from './dto/dlq-query.dto';
import { DlqEntryResponseDto } from './dto/dlq-entry-response.dto';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { SystemMessages } from '../common/constants/system.messages';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';

@ApiTags('Dead Letter Queue')
@Controller('dlq')
export class DlqController {
  constructor(private readonly dlqService: DlqService) {}

  @Get()
  @DlqDocs.FIND_ALL
  @ResponseMessage(SystemMessages.DLQ_FETCHED)
  async findAll(
    @Query() query: DlqQueryDto,
  ): Promise<PaginatedResult<DlqEntryResponseDto>> {
    const result = await this.dlqService.findAll(query);
    return {
      ...result,
      data: result.data.map((entry) => DlqEntryResponseDto.fromEntity(entry)),
    };
  }

  @Get(':id')
  @DlqDocs.FIND_ONE
  @ResponseMessage(SystemMessages.DLQ_ENTRY_FETCHED)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DlqEntryResponseDto> {
    const entry = await this.dlqService.findOne(id);
    return DlqEntryResponseDto.fromEntity(entry);
  }

  @Post(':id/retry')
  @HttpCode(200)
  @DlqDocs.RETRY
  @ResponseMessage(SystemMessages.DLQ_RETRY_QUEUED)
  async retry(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.dlqService.retry(id);
  }

  @Delete(':id')
  @HttpCode(200)
  @DlqDocs.DELETE
  @ResponseMessage(SystemMessages.DLQ_ENTRY_DELETED)
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.dlqService.delete(id);
  }
}
