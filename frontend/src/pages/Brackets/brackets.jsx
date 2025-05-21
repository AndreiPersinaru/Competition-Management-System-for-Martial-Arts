import { useState, useEffect, useMemo, useCallback } from "react";
import { Bracket, Seed, SeedItem, SeedTeam } from "react-brackets";
import { Select, MenuItem, FormControl, InputLabel, Box, Typography, Grid } from "@mui/material";
import axios from "axios";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import Navbar from "../../components/sections/Navbar/navbar";
import API_URL from "../../config";

const CustomSeed = ({ seed, breakpoint }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const hasValidMatch = seed.teams && seed.teams[0]?.name && seed.teams[0]?.name !== "-------" && seed.teams[1]?.name && seed.teams[1]?.name !== "-------";

    const handleClick = (meci) => {
        if (hasValidMatch) {
            navigate("/match-dashboard", {
                state: {
                    ...meci,
                    returnTo: location.pathname + location.search,
                },
            });
        }
    };

    return (
        <Seed mobileBreakpoint={breakpoint}>
            <SeedItem>
                <Box
                    onClick={() => handleClick(seed)}
                    style={{
                        cursor: hasValidMatch ? "pointer" : "default",
                    }}
                >
                    <SeedTeam
                        style={{
                            color: "black",
                            backgroundColor: "#f8f9fa",
                            width: "300px",
                            height: "50px",
                            fontSize: "18px",
                            fontWeight: "bold",
                            border: "1px solid black",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "0 15px",
                        }}
                    >
                        {seed.teams[0]?.name || "-------"}
                        <span style={{ fontSize: "24px" }}>{seed.teams[0]?.score ?? ""}</span>
                    </SeedTeam>
                    <SeedTeam
                        style={{
                            color: "white",
                            backgroundColor: "#1a53ff",
                            width: "300px",
                            height: "50px",
                            fontSize: "18px",
                            fontWeight: "bold",
                            border: "1px solid black",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "0 15px",
                        }}
                    >
                        {seed.teams[1]?.name || "-------"}
                        <span style={{ fontSize: "24px" }}>{seed.teams[1]?.score ?? ""}</span>
                    </SeedTeam>
                </Box>
            </SeedItem>
        </Seed>
    );
};

const BracketPage = () => {
    const apiClient = axios.create({ timeout: 5000, headers: { "Content-Type": "application/json" } });
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();

    const [bracketData, setBracketData] = useState([]);
    const [participants, setParticipants] = useState(0);
    const [categories, setCategories] = useState([]);
    const [sex, setSex] = useState("");
    const [age, setAge] = useState("");
    const [weight, setWeight] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState("");
    const [probes, setProbes] = useState([]);
    const [categoriiMap, setCategoriiMap] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);

    const updateURL = useCallback(
        (categoryId, sexValue, ageValue, weightValue) => {
            const params = new URLSearchParams();
            if (categoryId) params.set("proba", categoryId);
            if (sexValue) params.set("sex", sexValue);
            if (ageValue) params.set("age", ageValue);
            if (weightValue) params.set("weight", weightValue);

            setSearchParams(params, { replace: true });
        },
        [setSearchParams]
    );

    useEffect(() => {
        if (dataLoaded) {
            const probaParam = searchParams.get("proba");
            const sexParam = searchParams.get("sex");
            const ageParam = searchParams.get("age");
            const weightParam = searchParams.get("weight");

            if (probaParam) setSelectedCategoryId(probaParam);
            if (sexParam) setSex(sexParam);
            if (ageParam) setAge(ageParam);
            if (weightParam) setWeight(weightParam);
        }
    }, [searchParams, dataLoaded]);

    const handleProbaChange = useCallback(
        (value) => {
            setSelectedCategoryId(value);
            setSex("");
            setAge("");
            setWeight("");
            updateURL(value, "", "", "");
        },
        [updateURL]
    );

    const handleSexChange = useCallback(
        (value) => {
            setSex(value);
            setAge("");
            setWeight("");
            updateURL(selectedCategoryId, value, "", "");
        },
        [selectedCategoryId, updateURL]
    );

    const handleAgeChange = useCallback(
        (value) => {
            setAge(value);
            setWeight("");
            updateURL(selectedCategoryId, sex, value, "");
        },
        [selectedCategoryId, sex, updateURL]
    );

    const handleWeightChange = useCallback(
        (value) => {
            setWeight(value);
            updateURL(selectedCategoryId, sex, age, value);
        },
        [selectedCategoryId, sex, age, updateURL]
    );

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [meciuriRes, sportiviRes, categoriiRes] = await Promise.all([
                    apiClient.get(`${API_URL}/meciuri/`),
                    apiClient.get(`${API_URL}/sportivi/`),
                    apiClient.get(`${API_URL}/categorii/`),
                ]);

                const meciuri = meciuriRes.data;

                const sportiviMap = {};
                sportiviRes.data.forEach((s) => {
                    sportiviMap[s.id] = `${s.nume} ${s.prenume} (${s.club_nume})`;
                });

                const catMap = {};
                categoriiRes.data.forEach((cat) => {
                    catMap[cat.id] = {
                        proba: cat.proba,
                        sex: cat.sex,
                        varsta_min: cat.varsta_min,
                        varsta_max: cat.varsta_max,
                        categorie_greutate: cat.categorie_greutate,
                    };
                });
                setCategoriiMap(catMap);

                const categorySet = new Set();
                const probaIds = new Set();
                meciuri.forEach((m) => {
                    const c = catMap[m.categorie];
                    if (c) {
                        categorySet.add(`${m.categorie}-${c.sex}-${c.proba}-${c.varsta_min}-${c.varsta_max}`);
                        probaIds.add(c.proba);
                    }
                });

                const probeRes = await Promise.all(Array.from(probaIds).map((id) => apiClient.get(`${API_URL}/probe/${id}/`)));

                const probaMap = {};
                probeRes.forEach((res) => {
                    probaMap[res.data.id] = res.data.nume;
                });

                const uniqueCategories = Array.from(categorySet).map((item) => {
                    const [categorie, sex, probaId, varsta_min, varsta_max] = item.split("-");
                    const catObj = categoriiRes.data.find((c) => c.id == categorie);
                    return {
                        categorie,
                        sex,
                        probaId,
                        varsta_min,
                        varsta_max,
                        proba: probaMap[parseInt(probaId)],
                        categorie_greutate: catObj?.categorie_greutate || "",
                    };
                });

                setBracketData(
                    meciuri.map((m) => ({
                        ...m,
                        sex: catMap[m.categorie]?.sex,
                        varsta: `${catMap[m.categorie]?.varsta_min}-${catMap[m.categorie]?.varsta_max}`,
                        greutate: catMap[m.categorie]?.categorie_greutate,
                        sportiv1_nume: sportiviMap[m.sportiv1],
                        sportiv2_nume: sportiviMap[m.sportiv2],
                    }))
                );

                setCategories(uniqueCategories);
                setProbes(Object.entries(probaMap).map(([id, nume]) => ({ id: parseInt(id), nume })));
                setDataLoaded(true);
            } catch (error) {
                console.error("Eroare la fetch:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        if (dataLoaded && location.state?.refreshData) {
            const refreshMatches = async () => {
                try {
                    const meciuriRes = await apiClient.get(`${API_URL}/meciuri/`);
                    const meciuri = meciuriRes.data;

                    setBracketData((prevData) =>
                        meciuri.map((m) => {
                            const existing = prevData.find((p) => p.id === m.id);
                            return {
                                ...m,
                                sex: existing?.sex,
                                varsta: existing?.varsta,
                                greutate: existing?.greutate,
                                sportiv1_nume: existing?.sportiv1_nume,
                                sportiv2_nume: existing?.sportiv2_nume,
                            };
                        })
                    );
                } catch (error) {
                    console.error("Eroare la refresh meciuri:", error);
                }
            };

            refreshMatches();
            window.history.replaceState({}, document.title);
        }
    }, [dataLoaded, location.state, apiClient]);

    const { filteredData, participantsCount } = useMemo(() => {
        if (!selectedCategoryId || !sex || !age || !weight) {
            return { filteredData: [], participantsCount: 0 };
        }

        const filtered = bracketData.filter(
            (m) => m.sex === sex && m.varsta === age && m.greutate === weight && categories.find((c) => c.probaId == selectedCategoryId && c.categorie == m.categorie && c.categorie_greutate == weight)
        );

        const ids = new Set();
        filtered.forEach((m) => {
            if (m.sportiv1) ids.add(m.sportiv1);
            if (m.sportiv2) ids.add(m.sportiv2);
        });

        return { filteredData: filtered, participantsCount: ids.size };
    }, [selectedCategoryId, sex, age, weight, bracketData, categories]);

    useEffect(() => {
        setParticipants(participantsCount);
    }, [participantsCount]);

    const buildBracketStructure = useCallback((participantsCount, matches) => {
        const matchMap = Object.fromEntries(matches.map((m) => [m.id, m]));
        const matchIds = matches.map((m) => m.id).sort((a, b) => a - b);
        let index = 0;

        const getMatch = () => {
            const match = matchMap[matchIds[index]];
            index++;
            return (
                match || {
                    id: matchIds[index - 1] || `new-${index}`,
                    teams: [
                        { name: "-------", score: "" },
                        { name: "-------", score: "" },
                    ],
                }
            );
        };

        if (participantsCount === 2 || participantsCount === 3) {
            return [
                { title: "Meci 1", seeds: [getMatch()] },
                { title: "Meci 2", seeds: [getMatch()] },
                { title: "Meci 3", seeds: [getMatch()] },
            ];
        }

        if (participantsCount === 4) {
            return {
                main: [
                    { title: "Semifinale", seeds: [getMatch(), getMatch()] },
                    { title: "Finala", seeds: [getMatch()] },
                ],
                loser: [{ title: "Locul 3", seeds: [getMatch()] }],
            };
        }

        if (participantsCount > 4 && participantsCount <= 8) {
            return {
                main: [
                    { title: "Sferturi", seeds: [getMatch(), getMatch(), getMatch(), getMatch()] },
                    { title: "Semifinale", seeds: [getMatch(), getMatch()] },
                    { title: "Finala", seeds: [getMatch()] },
                ],
                loser: [
                    { title: "Runda 1 Pierzatori", seeds: [getMatch(), getMatch()] },
                    { title: "Runda 2 Pierzatori", seeds: [getMatch(), getMatch()] },
                    { title: "Locul 3", seeds: [getMatch()] },
                ],
            };
        }

        return null;
    }, []);

    const bracketStructure = useMemo(() => {
        if (filteredData.length === 0 || participants === 0) {
            return null;
        }

        const matchData = filteredData.map((m) => {
            const cat = categoriiMap[m.categorie];
            const probaNume = probes.find((p) => p.id === cat?.proba)?.nume;
            return {
                id: m.id,
                teams: [
                    { idSportiv: m.sportiv1, name: m.sportiv1_nume || "-------", score: m.scor1 },
                    { idSportiv: m.sportiv2, name: m.sportiv2_nume || "-------", score: m.scor2 },
                ],
                greutate: m.greutate,
                varsta: m.varsta,
                sex: m.sex,
                proba: probaNume,
            };
        });

        return buildBracketStructure(participants, matchData);
    }, [filteredData, participants, categoriiMap, probes, buildBracketStructure]);

    const renderBracket = () => {
        if (!bracketStructure) {
            return null;
        }

        if (participants === 2 || participants === 3) {
            return <Bracket key={`${selectedCategoryId}-${sex}-${age}-${weight}`} rounds={bracketStructure} renderSeedComponent={CustomSeed} />;
        }

        if (participants > 3 && participants <= 8) {
            return (
                <Box display="flex" flexDirection="column" gap={5}>
                    <Box>
                        <Typography variant="h6">Main Bracket</Typography>
                        <Bracket key={`main-${selectedCategoryId}-${sex}-${age}-${weight}`} rounds={bracketStructure.main} renderSeedComponent={CustomSeed} />
                    </Box>
                    <Box>
                        <Typography variant="h6">Loser Bracket</Typography>
                        <Bracket key={`loser-${selectedCategoryId}-${sex}-${age}-${weight}`} rounds={bracketStructure.loser} renderSeedComponent={CustomSeed} />
                    </Box>
                </Box>
            );
        }

        return null;
    };

    const availableSexOptions = useMemo(() => {
        if (!selectedCategoryId) return [];
        return Array.from(new Set(categories.filter((c) => c.probaId == selectedCategoryId).map((c) => c.sex)));
    }, [categories, selectedCategoryId]);

    const availableAgeOptions = useMemo(() => {
        if (!selectedCategoryId || !sex) return [];
        return Array.from(new Set(categories.filter((c) => c.probaId == selectedCategoryId && c.sex === sex).map((c) => `${c.varsta_min}-${c.varsta_max}`)));
    }, [categories, selectedCategoryId, sex]);

    const availableWeightOptions = useMemo(() => {
        if (!selectedCategoryId || !sex || !age) return [];
        return Array.from(new Set(categories.filter((c) => c.probaId == selectedCategoryId && c.sex === sex && `${c.varsta_min}-${c.varsta_max}` === age).map((c) => c.categorie_greutate)));
    }, [categories, selectedCategoryId, sex, age]);

    if (isLoading) {
        return (
            <Box p={3} display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <Typography variant="h6">Se încarcă datele...</Typography>
            </Box>
        );
    }

    return (
        <>
            <Navbar />
            <Box p={3} mt={"4.5rem"}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>Probă</InputLabel>
                            <Select value={selectedCategoryId || ""} label="Probă" onChange={(e) => handleProbaChange(e.target.value)}>
                                {probes.map((proba) => (
                                    <MenuItem key={proba.id} value={proba.id}>
                                        {proba.nume}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth disabled={!selectedCategoryId}>
                            <InputLabel>Gen</InputLabel>
                            <Select value={sex} label="Gen" onChange={(e) => handleSexChange(e.target.value)}>
                                {availableSexOptions.map((sexOption) => (
                                    <MenuItem key={sexOption} value={sexOption}>
                                        {sexOption === "M" ? "Masculin" : "Feminin"}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth disabled={!sex}>
                            <InputLabel>Vârstă</InputLabel>
                            <Select value={age} label="Vârstă" onChange={(e) => handleAgeChange(e.target.value)}>
                                {availableAgeOptions.map((ageOption) => (
                                    <MenuItem key={ageOption} value={ageOption}>
                                        {ageOption}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth disabled={!age}>
                            <InputLabel>Greutate</InputLabel>
                            <Select value={weight} label="Greutate" onChange={(e) => handleWeightChange(e.target.value)}>
                                {availableWeightOptions.map((weightOption) => (
                                    <MenuItem key={weightOption} value={weightOption}>
                                        {weightOption} KG
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>

                <Box mt={4}>
                    {filteredData.length > 0 && participants > 0 ? (
                        renderBracket()
                    ) : (
                        <Typography variant="h6" align="center" mt={5}>
                            Selectează proba, genul, vârsta și greutatea pentru a vizualiza bracketul.
                        </Typography>
                    )}
                </Box>
            </Box>
        </>
    );
};

export default BracketPage;
