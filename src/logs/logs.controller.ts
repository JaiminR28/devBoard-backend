import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { LogsService } from './logs.service';

@Controller('logs')
export class LogsController {
    constructor(private logsService: LogsService) { }

    @Get()
    findAll() {
        return this.logsService.findAll()
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.logsService.findOne(id);
    }

    @Post()
    create(@Body() body: { title: string; content: string; tags: string[] }) {
        return this.logsService.create(body);
    }

    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { title?: string; content?: string; tags?: string[] },
    ) {
        return this.logsService.update(id, body);
    }

    @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.logsService.remove(id);
  }
}
