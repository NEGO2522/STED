import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { ref, onValue, push, set } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/clerk-react';

function Survey() {
  const [surveyQuestions, setSurveyQuestions] = useState([]);
  const [responses, setResponses] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();
  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate('/');
    }
  }, [isLoaded, isSignedIn, navigate]);

  useEffect(() => {
    const checkIfAlreadySubmitted = async () => {
      if (isLoaded && isSignedIn && user) {
        const userId = user.id;
        const responseRef = ref(db, `users/${userId}/responses`);

        onValue(responseRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            navigate('/home');
          }
        });
      }
    };

    checkIfAlreadySubmitted();
  }, [isLoaded, isSignedIn, user, navigate]);

  useEffect(() => {
    if (isSignedIn && user) {
      const name = user.fullName || user.firstName || "Anonymous";
      const email = user.primaryEmailAddress?.emailAddress || "no-email@example.com";
      const userId = user.id;

      const userRef = ref(db, `users/${userId}`);
      set(userRef, {
        name,
        email,
        currentTask: "task1",
        xp: 0,
        level: 1,
        tasksCompleted: 0,
        signedUpAt: new Date().toISOString()
      });
    }
  }, [isSignedIn, user]);

  useEffect(() => {
    const surveyRef = ref(db, 'survey');
    onValue(surveyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const formatted = Object.keys(data).map((key) => ({
          id: key,
          question: data[key].question,
          options: data[key].option || {}
        }));
        setSurveyQuestions(formatted);
      }
    });
  }, []);

  const handleChange = (question, answer) => {
    setResponses((prev) => ({
      ...prev,
      [question]: answer
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < surveyQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (isSignedIn && user) {
      const userResponseRef = ref(db, `users/${user.id}/responses`);
      set(userResponseRef, {
        SurveyResponses: responses,
        submittedAt: new Date().toISOString()
      });
    }

    setSubmitted(true);
    setTimeout(() => navigate('/home'), 2000);
  };

  const currentQuestion = surveyQuestions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Professional top accent line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-blue-600" />

      {/* Subtle background decorations */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-50 to-transparent opacity-50" />

      <div className="container mx-auto px-6 py-12 max-w-3xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg shadow-md border-t border-blue-100 p-8"
        >
          {!submitted ? (
            <AnimatePresence mode="wait">
              {currentQuestion && (
                <motion.div
                  key={currentQuestionIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Progress indicator */}
                  <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-slate-600">
                        Question {currentQuestionIndex + 1} of {surveyQuestions.length}
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="text-sm text-slate-500">
                        {Math.round(((currentQuestionIndex + 1) / surveyQuestions.length) * 100)}% Complete
                      </span>
                    </div>
                    <div className="w-32">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-blue-600"
                          initial={{ width: 0 }}
                          animate={{
                            width: `${((currentQuestionIndex + 1) / surveyQuestions.length) * 100}%`
                          }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg">
                    <h3 className="text-2xl font-semibold text-slate-800 mb-6">
                      {currentQuestion.question}
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(currentQuestion.options).map(([key, value]) => (
                        <motion.label
                          key={key}
                          whileHover={{ translateX: 2 }}
                          whileTap={{ scale: 0.995 }}
                          className={`flex items-center p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                            responses[currentQuestion.question] === value
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          <input
                            type="radio"
                            name={currentQuestion.question}
                            value={value}
                            onChange={() => handleChange(currentQuestion.question, value)}
                            checked={responses[currentQuestion.question] === value}
                            className="hidden"
                          />
                          <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                            responses[currentQuestion.question] === value
                              ? 'border-white'
                              : 'border-slate-400'
                          }`}>
                            {responses[currentQuestion.question] === value && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-2 h-2 bg-white rounded-full"
                              />
                            )}
                          </div>
                          <span className="text-base">{value}</span>
                        </motion.label>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end pt-6 border-t border-slate-100">
                    <motion.button
                      whileHover={{ translateY: -1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleNext}
                      disabled={!responses[currentQuestion.question]}
                      className={`${
                        responses[currentQuestion.question]
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      } px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 flex items-center`}
                    >
                      {currentQuestionIndex === surveyQuestions.length - 1 ? (
                        <>
                          Submit Survey
                          <svg 
                            className="w-4 h-4 ml-2" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        </>
                      ) : (
                        <>
                          Continue
                          <svg 
                            className="w-4 h-4 ml-2" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 bg-blue-50 rounded-full mx-auto mb-6 flex items-center justify-center">
                <svg 
                  className="w-8 h-8 text-blue-600" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-slate-800 mb-2">
                Survey Completed
              </h3>
              <p className="text-slate-600">
                Thank you for your responses. You will be redirected shortly.
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Professional bottom accent line */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600" />
    </div>
  );
}

export default Survey;
