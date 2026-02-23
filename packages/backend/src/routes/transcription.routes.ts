import { Router, Request, Response, type IRouter } from 'express';
import { transcriptionService } from '../services/transcription.service.js';
import { whisperService } from '../services/ai/whisper.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router: IRouter = Router();

router.use(authMiddleware);

router.get('/appointments/:appointmentId/transcription', async (req: Request<{ appointmentId: string }>, res: Response) => {
  try {
    const transcription = await transcriptionService.getTranscription(
      req.params.appointmentId,
      req.userId!
    );

    if (!transcription) {
      return res.status(404).json({ success: false, message: 'Transcripción no encontrada' });
    }

    res.json({ success: true, data: transcription });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    res.status(500).json({ success: false, message: errorMessage });
  }
});

router.get('/ai/health', async (_req: Request, res: Response) => {
  try {
    const whisperOk = await whisperService.healthCheck();

    res.json({
      success: true,
      data: { whisper: whisperOk, configured: !!process.env.OPENAI_API_KEY },
    });
  } catch {
    res.status(500).json({ success: false, message: 'AI health check failed' });
  }
});

export default router;
