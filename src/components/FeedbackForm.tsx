import React from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AudioWaveform } from "@/components/AudioWaveform";
import { Mic } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useLanguage } from "@/components/LanguageProvider";

interface FeedbackFormProps {
  showFeedbackDialog: boolean;
  setShowFeedbackDialog: (open: boolean) => void;
  feedbackText: string;
  setFeedbackText: (text: string) => void;
  feedbackOptions: string[];
  isFeedbackRecording: boolean;
  toggleFeedbackRecording: () => void;
  feedbackAudioLevel: number;
  submitFeedback: () => void;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({
  showFeedbackDialog,
  setShowFeedbackDialog,
  feedbackText,
  setFeedbackText,
  feedbackOptions,
  isFeedbackRecording,
  toggleFeedbackRecording,
  feedbackAudioLevel,
  submitFeedback,
}) => {
  const { t } = useLanguage();

  return (
    <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("feedbackTitle")}</DialogTitle>
          <DialogDescription>
            {t("feedbackDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            {feedbackOptions.map((option, index) => (
              <Button 
                key={index} 
                variant="outline" 
                className="w-full justify-start text-left h-auto py-3"
                onClick={() => setFeedbackText(option)}
              >
                {option}
              </Button>
            ))}
          </div>
          <div className="relative">
            <Textarea
              placeholder={t("feedbackPlaceholder") as string}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className="min-h-[50px] pr-12 resize-none"
            />
            <div className="absolute right-2 top-4">
              <Button
                onClick={toggleFeedbackRecording}
                variant={isFeedbackRecording ? "destructive" : "outline"}
                size="icon"
                className="rounded-full h-9 w-9 flex items-center justify-center"
                aria-label={isFeedbackRecording ? "Stop recording feedback" : "Record voice feedback"}
              >
                {isFeedbackRecording ? (
                  <AudioWaveform isActive={isFeedbackRecording} audioLevel={feedbackAudioLevel} />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setShowFeedbackDialog(false)}>
            {t("feedbackCancel")}
          </Button>
          <Button onClick={submitFeedback} disabled={!feedbackText.trim()}>
            {t("feedbackSubmit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
