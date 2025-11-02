import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Calendar, Sparkles, Users, ChevronRight } from 'lucide-react';

interface WelcomeScreenProps {
  onComplete: () => void;
}

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: Calendar,
      title: 'Track Your Shows',
      description: 'Add your favorite TV shows and see all upcoming episodes in one unified calendar. Never miss a release again.',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Sparkles,
      title: 'Discover New Content',
      description: 'Swipe through personalized recommendations. Like it? It\'s added to your list. Pass? Move on to the next.',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: Users,
      title: 'Match with Friends',
      description: 'Create groups with your partner or friends. Swipe together on the same content and find mutual matches instantly.',
      color: 'from-orange-500 to-red-500',
    },
  ];

  const currentStep = steps[step];
  const Icon = currentStep.icon;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className={`bg-gradient-to-r ${currentStep.color} p-4 rounded-full`}>
              <Icon className="w-10 h-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">{currentStep.title}</CardTitle>
          <CardDescription className="text-base mt-3">
            {currentStep.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Dots */}
          <div className="flex justify-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === step ? 'bg-purple-600 w-6' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            {step > 0 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="flex-1"
              >
                Back
              </Button>
            )}
            <Button
              onClick={() => {
                if (step < steps.length - 1) {
                  setStep(step + 1);
                } else {
                  onComplete();
                }
              }}
              className="flex-1"
            >
              {step < steps.length - 1 ? (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              ) : (
                'Get Started'
              )}
            </Button>
          </div>

          {step === steps.length - 1 && (
            <button
              onClick={onComplete}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
            >
              Skip
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
