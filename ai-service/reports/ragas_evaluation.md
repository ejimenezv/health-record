# RAGAS Evaluation Report

**Generated:** 2026-04-30 21:57:38

## Summary

| Metric | Score | Requirement | Status |
|--------|-------|-------------|--------|
| Faithfulness | 0.938 | > 0.80 | Pass |
| Context Precision | 1.000 | > 0.75 | Pass |
| Answer Relevancy | 0.964 | - | - |
| Context Recall | 1.000 | - | - |

## Interpretation

### Faithfulness (0.938)
Measures how factually accurate the generated answers are based on the retrieved context.
- High (>0.80): Answers are well-grounded in the provided context
- Medium (0.60-0.80): Some hallucinations or unsupported claims
- Low (<0.60): Significant hallucinations

### Context Precision (1.000)
Measures how relevant the retrieved context is to the question.
- High (>0.75): Retrieved context is highly relevant
- Medium (0.50-0.75): Some irrelevant context retrieved
- Low (<0.50): Poor retrieval quality

### Answer Relevancy (0.964)
Measures how relevant the answer is to the question.

### Context Recall (1.000)
Measures how complete the retrieved context is (requires ground truth).

## Detailed Results

### Per-Question Analysis

#### Question 1

**Q:** ¿Cuáles son las contraindicaciones del ibuprofeno?

**A:** Las principales contraindicaciones del ibuprofeno incluyen úlcera péptica activa, insuficiencia renal severa, alergia conocida a AINEs, y tercer trimestre del embarazo.

**Contexts:** 2 chunks retrieved

---

#### Question 2

**Q:** ¿Qué dosis de paracetamol se recomienda para adultos?

**A:** La dosis recomendada de paracetamol para adultos es de 500-1000mg cada 6-8 horas, sin exceder 4000mg en 24 horas.

**Contexts:** 2 chunks retrieved

---

#### Question 3

**Q:** ¿Cuál es el código CIE-10 para migraña?

**A:** El código CIE-10 para migraña sin especificación es G43.9.

**Contexts:** 2 chunks retrieved

---

#### Question 4

**Q:** ¿Qué es la cefalea tensional?

**A:** La cefalea tensional es un tipo de dolor de cabeza caracterizado por dolor bilateral de tipo opresivo, generalmente leve a moderado.

**Contexts:** 2 chunks retrieved

---

#### Question 5

**Q:** ¿Puede el ibuprofeno tomarse con anticoagulantes?

**A:** No se recomienda el uso concomitante de ibuprofeno con anticoagulantes debido al aumento del riesgo de sangrado.

**Contexts:** 2 chunks retrieved

---

#### Question 6

**Q:** ¿Cuáles son los síntomas de la hipertensión arterial?

**A:** La hipertensión arterial es generalmente asintomática, pero en algunos casos puede causar dolor de cabeza, mareos, visión borrosa o sangrado nasal.

**Contexts:** 2 chunks retrieved

---

#### Question 7

**Q:** ¿Qué medicamentos son AINEs?

**A:** Los AINEs (Antiinflamatorios No Esteroideos) incluyen ibuprofeno, naproxeno, diclofenaco, ketoprofeno y ácido acetilsalicílico (aspirina).

**Contexts:** 2 chunks retrieved

---

#### Question 8

**Q:** ¿Cuál es la diferencia entre migraña y cefalea tensional?

**A:** La migraña se caracteriza por dolor pulsátil unilateral, de moderado a severo, con náuseas y fotofobia. La cefalea tensional es bilateral, opresiva y de menor intensidad.

**Contexts:** 2 chunks retrieved

---

