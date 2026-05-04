export const getApiErrorMessage = (error, fallback = "Une erreur est survenue.") => {
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.response?.data?.message) return error.response.data.message;

  if (!error?.response && error?.message === "Network Error") {
    return "Connexion au serveur impossible. Vérifie que l'API est bien lancée.";
  }

  return error?.message || fallback;
};
