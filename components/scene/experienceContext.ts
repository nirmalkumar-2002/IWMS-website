import { createContext, useContext } from 'react';

export const ExperienceContext = createContext(false);
export const useSiteExperience = () => useContext(ExperienceContext);
