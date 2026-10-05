import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Lenis from 'lenis';
gsap.registerPlugin(ScrollTrigger, useGSAP);
export { gsap, ScrollTrigger, Lenis };
